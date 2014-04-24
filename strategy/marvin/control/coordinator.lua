local Agent = {
	Attacker = require "agent/attacker",
	Defender = require "agent/defender",
	Keeper = require "agent/keeper",
	Hidden = require "agent/hidden",
	Manual = require "agent/manual"
}
local Class = require "../base/class"
local World = require "../base/world"
local debug = require "../base/debug"
local Entrypoints = require "../base/entrypoints"
local Field = require "util/field"
local Referee = require "../base/referee"
local AgentPool = require "control/agentpool"
local Messaging = require "control/messaging"
local debug = require "../base/debug"
local vis = require "../base/vis"

local Coordinator = (require "../base/class").new("Control.Coordinator")

function Coordinator:init()
	self._pools = {
		manual = AgentPool.create(Agent.Manual),
		keeper = AgentPool.create(Agent.Keeper),
		defense = AgentPool.create(Agent.Defender),
		attack = AgentPool.create(Agent.Attacker),
		hidden = AgentPool.create(Agent.Hidden)
	}
	self._poolGroups = {
		{ self._pools.manual },
		{ self._pools.keeper },
		{ self._pools.defense, self._pools.attack },
		{ self._pools.hidden }
	}
	self.exclusiveRoles = {} -- remember roles
	self._ballInFriendlyFieldHalf = false -- remember for hysteresis
	self._messages = nil
	self._mainAttackerIsDefender = false
	self._oppsToMark = {}
end

function Coordinator:run()
	self:_updatePoolRobots()
	-- TODO: facilities for learning
	
	self._messages = Messaging.getExclusiveRoleApplications()
	debug.pushtop("Role Applications")
	for role, application in pairs(self._messages) do
		debug.push(role)
		for robot, rating in pairs(application) do
			debug.set(robot.id, rating)
		end
		debug.pop() -- role
	end
	debug.pop() -- Role Applications
	self:_chooseExclusiveRoles()
	self:_organizeDefense()
	Messaging.deliverMessages()

	-- run every pool and thus every agent
	for _, pool in pairs(self._pools) do
		pool:run()
	end
end

function Coordinator:_updatePoolRobots()
	local attackers, defenders = self:_calculateAttackRatio()
	
	-- if keeper is on the field, it is managed by the keeper pool
	if World.FriendlyKeeper and World.FriendlyKeeper.isVisible then
		defenders = defenders - 1
	end
	
	-- limit robot counts on attack/defense pool, causes automatic robot balancing
	self._pools.attack:setRobotLimit(attackers)
	self._pools.defense:setRobotLimit(defenders) -- defenders may be negative
	
	-- remove no longer needed / surplus robots from pools
	for _, pool in pairs(self._pools) do
		pool:cleanupRobots()
	end
	
	-- find unassigned robots
	local occupiedRobots = {}
	for _, pool in pairs(self._pools) do
		for _, robot in pairs(pool:robots()) do
			occupiedRobots[robot.id] = true
		end
	end
	local unassignedRobots = {}
	for _, robot in pairs(World.FriendlyRobotsById) do
		if not occupiedRobots[robot.id] then
			table.insert(unassignedRobots, robot)
		end
	end
	
	-- assign robots to pools by pool groups
	-- assign to first group until these pools don't want any further robots
	-- the continue with the second group and so on
	-- if a group has multiple pools assignment altnerates between them
	for _, group in ipairs(self._poolGroups) do
		local groupFinished
		repeat
			groupFinished = true
			for _, pool in ipairs(group) do
				if #unassignedRobots == 0 then
					break
				end
				local robot = pool:takeRobot(unassignedRobots)
				if robot then
					groupFinished = false
					table.removeValue(unassignedRobots, robot)
				end
			end
		until groupFinished
	end
end

--- chooses a robot for every exclusiveRole and sends a message to it
function Coordinator:_chooseExclusiveRoles()
	local hysteresis = 0.1 -- magic constant
	local roleApplications = Messaging.getExclusiveRoleApplications()

	local exclusiveRoles = {} -- ensure that special roles are removed if no one applies
	for role, applications in pairs(roleApplications) do
		local bestRobot = nil
		local bestRating = -math.huge
		for robot, rating in pairs(applications) do
			if self.exclusiveRoles[role] == robot then
				rating = rating + hysteresis
			end
			if rating > bestRating then
				bestRobot = robot
				bestRating = rating
			end
		end
		if bestRobot then
			exclusiveRoles[role] = bestRobot
			Messaging.sendExclusiveRole(role, exclusiveRoles[role])
		end
	end
	self.exclusiveRoles = exclusiveRoles

	local mainAttacker = self.exclusiveRoles["mainAttacker"]
	if mainAttacker then
		self._mainAttackerIsDefender = false
		if self._pools.defense._agents then
			for _, agent in ipairs(self._pools.defense._agents) do
				if agent:robot() == mainAttacker then
					self._mainAttackerIsDefender = true
				end
			end
		end
		local color = World.TeamIsBlue and vis.colors.blue or vis.colors.yellow
		vis.addCircle("mainAttacker", mainAttacker.pos, 0.12, color, true, true);
	end
end

function Coordinator:_organizeDefense()
	local unassigned = table.copy(self._pools.defense:robots())

	-- at least one CenterBack
	local currentCenterBacks = Messaging.trainerGet("centerbackTarget")
	local defaultCenterBack = nil
	local bestRating = -1
	local pureCenterBackBefore = false
	for _, robot in pairs(unassigned) do
		local rating = math.max(0, 1 - Field.distanceToFriendlyDefenseArea(robot.pos, robot.radius))
		if (not pureCenterBackBefore and rating > bestRating) or
			(not pureCenterBackBefore and currentCenterBacks[robot] == World.Ball) or
			(currentCenterBacks[robot] == World.Ball and rating > bestRating)
		then
			bestRating = rating
			defaultCenterBack = robot
		end
		if currentCenterBacks[robot] == World.Ball then
			pureCenterBackBefore = true
		end
	end
	if defaultCenterBack then
		table.removeValue(unassigned, defaultCenterBack)
	end

	-- look for opponents to mark
	local defendedByDuel = Messaging.trainerGet("defendedOpponent")
	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = table.contains(self._oppsToMark, robot)
		local maxYPos = alreadyTargeted
			and World.Geometry.FieldHeight / 4 or World.Geometry.FieldHeight / 6
		local minBallDist = alreadyTargeted	and 0.6 or 0.75
		local shouldMark = not defendedByDuel[robot] and robot.pos.y < maxYPos and
			(not Referee.isStopState() or robot.pos:distanceTo(World.Ball.pos) > minBallDist)	
		if alreadyTargeted and not shouldMark then
			table.removeValue(self._oppsToMark, robot)
		elseif not alreadyTargeted and shouldMark then
			table.insert(self._oppsToMark, robot)
		end
	end
	table.sort(self._oppsToMark, function(r1, r2)
		return r1.pos:distanceTo(World.Geometry.FriendlyGoal) < r2.pos:distanceTo(World.Geometry.FriendlyGoal)
	end)

	local manMarkers = {}
	local marked = {}
	-- respect marking targets of centerBecks
	for centerBack, opp in pairs(currentCenterBacks) do
		if table.contains(self._oppsToMark, opp) then
			manMarkers[centerBack] = opp
			table.removeValue(unassigned, centerBack)
			marked[opp] = true
		end	
	end
	for _, robot in ipairs(self._oppsToMark) do
		if #unassigned == 0 then
			break
		end
		if not marked[robot] then
			table.sort(unassigned, function(r1, r2)
				return r1.pos:distanceTo(robot.pos) < r2.pos:distanceTo(robot.pos)
			end)
			manMarkers[table.remove(unassigned, 1)] = robot
		end
	end

	for manMarker, opp in pairs(manMarkers) do
		Messaging.assignRole(manMarker, "ManMark", opp)
	end
	if defaultCenterBack then
		debug.set("default CenterBack", defaultCenterBack)
		Messaging.assignRole(defaultCenterBack, "CenterBack")
	end
end

function Coordinator:_calculateAttackRatio()
	if (self._ballInFriendlyFieldHalf and World.Ball.pos.y < -0.5) or
		(not self._ballInFriendlyFieldHalf and World.Ball.pos.y > 0.5)
	then
		self._ballInFriendlyFieldHalf = not self._ballInFriendlyFieldHalf
	end
	local friendlyCorner = Field.isInOwnCorner(World.Ball.pos, false)
	local opponentCorner = Field.isInOwnCorner(World.Ball.pos, true)
	
	-- === Attacker/Defender Distrubuten ===
	-- when there are 6 robots on the field, attackRatio is the number of attackers
	-- for the general formula, see below
	-- General (ie Game, Stop)
	local attackRatio = self._ballInFriendlyFieldHalf and 3 or 2

	if World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive" then
		attackRatio = 4
	elseif World.RefereeState == "KickoffDefensivePrepare" or World.RefereeState == "KickoffDefensive" then
		attackRatio = 3

	elseif World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive" then
		if friendlyCorner then -- Goal-Kick Offensive
			attackRatio = 3
		elseif opponentCorner then -- Corner-Kick Offensive
			attackRatio = 4
		else
			attackRatio = 3 -- Throw-In Offensive
		end

	elseif World.RefereeState == "DirectDefensive" or World.RefereeState == "IndirectDefensive" then
		if friendlyCorner then -- Corner-Kick Defensive
			attackRatio = 1
		elseif opponentCorner then -- Goal-Kick Defensive
			attackRatio = 2
		else -- Throw-In Defensive
			attackRatio = 2
		end
	elseif World.RefereeState ==  "Stop" then
		attackRatio = 1
	end
	
	if World.GameStage == "PenaltyShootout" then
		attackRatio = 6
	end

	if self._mainAttackerIsDefender then
		attackRatio = attackRatio - 1
	end
	
	debug.set("AttackRatio", attackRatio)
	local attackers = math.roundUpwards(attackRatio/6 * #World.FriendlyRobots, 0)
	local defenders = #World.FriendlyRobots - attackers
	return attackers, defenders
end

local coord = nil
Entrypoints.add(" main", function()
	if not coord then
		coord = Coordinator.create()
	end
	coord:run()
end)

return Coordinator
