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
local Field = require "../base/field"
local Defense = require "util/defense"
local Referee = require "../base/referee"
local AgentPool = require "control/agentpool"
local Messaging = require "control/messaging"
local debug = require "../base/debug"
local vis = require "../base/vis"

local Coordinator = Class("Control.Coordinator")

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
	self._oppFreeKickOngoing = false
	self._mainAttackerIsDefender = false
	self._oppsToMark = {}
	self._send, self._inbox = Messaging.registerTrainer()

	self._customAttackRatio = nil
end

local ballWasVisibleBefore = true
local lastBallValid = 0
function Coordinator:run()
	-- check ball visibility
	if not World.Ball:isPositionValid() and World.Time-lastBallValid > 0.5 and
			(World.RefereeState == "Game" or World.RefereeState == "GameForce")
			and ballWasVisibleBefore then
		ballWasVisibleBefore = false
		log("<font color=\"red\">Ball invisible!</font>")
	else
		ballWasVisibleBefore = true
		lastBallValid = World.Time
	end

	debug.pushtop("Trainer")
	for name, func in pairs(self._inbox) do
		debug.push(name)
		for sender, msg in pairs(func()) do
			debug.set(sender.id or sender, msg)
		end
		debug.pop() -- name
	end
	debug.pop()-- Trainer
	self:_chooseExclusiveRoles()
	self:_updatePoolRobots()
	if not World.RefereeState:find("KickoffDefensive") then
		self:_chooseManMarkAndCenterBacks()
	end
	Messaging.deliverMessages()

	-- run every pool and thus every agent
	for _, pool in pairs(self._pools) do
		pool:run()
	end
end

function Coordinator:_updatePoolRobots()
	local attackers, defenders = self:_calculateAttackRatio()

	-- limit robot counts on attack/defense pool, causes automatic robot balancing
	self._pools.attack:setRobotLimit(attackers)
	self._pools.defense:setRobotLimit(defenders)

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

	if Referee.isStopState() then
		hysteresis = math.huge
	end

	local roleMsgs = self._inbox.exclusiveRole()
	local roleApplications = {}
	for robot, application in pairs(roleMsgs) do
		for role, rating in pairs(application) do
			if not roleApplications[role] then
				roleApplications[role] = {}
			end
			roleApplications[role][robot] = rating
		end
	end

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
			self._send[role]("all", bestRobot)
		end
	end
	self.exclusiveRoles = exclusiveRoles

	local _, mainAttacker = next(Messaging.get("mainAttacker"))
	self._mainAttackerIsDefender = false
	if mainAttacker then
		if self._pools.defense._agents then
			for _, agent in ipairs(self._pools.defense._agents) do
				if agent:robot() == mainAttacker then
					self._mainAttackerIsDefender = true
				end
			end
		end
		local color = World.TeamIsBlue and vis.colors.blue or vis.colors.yellow
		vis.addCircle("c/coordinator: MainAttacker", mainAttacker.pos, 0.12, color, true, true);
	end
end

local function isVisible(robot)
	return robot.isVisible
end
local function distToFriendlyGoal(r1, r2)
	return r1.pos:distanceTo(World.Geometry.FriendlyGoal)
		< r2.pos:distanceTo(World.Geometry.FriendlyGoal)
end
local function lesserX(r1, r2)
	return r1.pos.x < r2.pos.x
end

local minOppDistToBallForMarking = 0.3
local function nearestOppToBall()
	local ballPos = World.Ball.pos
	local nearestOppToBall
	local minDist = math.huge
	for _, opp in ipairs(World.OpponentRobots) do
		local dist = opp.pos:distanceTo(ballPos)
		if dist < minDist and dist < minOppDistToBallForMarking then
			nearestOppToBall = opp
			minDist = dist
		end
	end
	return nearestOppToBall
end

local countersideTargetLeft = { pos = Vector.create(-World.Geometry.FieldWidthHalf, 0) }
local countersideTargetRight = { pos = Vector.create(World.Geometry.FieldWidthHalf, 0) }
function Coordinator:_chooseManMarkAndCenterBacks()
	self._oppsToMark = table.filter(self._oppsToMark, isVisible)
	local nearestOppToBall = nearestOppToBall()
	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = table.contains(self._oppsToMark, robot)
		local maxYPos = alreadyTargeted
			and World.Geometry.FieldHeight / 4 or World.Geometry.FieldHeight / 6
		local minBallDist = alreadyTargeted	and 0.6 or 0.75
		local shouldMark = robot ~= nearestOppToBall and robot.pos.y < maxYPos and
			(not Referee.isStopState() or robot.pos:distanceTo(World.Ball.pos) > minBallDist)
		if alreadyTargeted and not shouldMark then
			table.removeValue(self._oppsToMark, robot)
		elseif not alreadyTargeted and shouldMark then
			table.insert(self._oppsToMark, robot)
		end
	end
	table.sort(self._oppsToMark, distToFriendlyGoal)

	local unassigned = table.copy(self._pools.defense:robots())
	local needCountersideCB = Referee.isStopState() and World.Ball.pos.y < 0
		and #unassigned - #self._oppsToMark >= 2
	-- cbs are "pure" if they defend the ball and are close to the defense area
	local pureCenterBacks = {}
	local pureCenterBacksArray = {}
	-- pure centerbacks are treated as unassigned until there is only 1 left
	local markedOpps = {}
	local defaultCenterBack, countersideCenterBack
	for robot, target in pairs(self._inbox.centerbackTarget()) do
		if target == World.Ball and
				Field.distanceToFriendlyDefenseArea(robot.pos, robot.radius) < 4*robot.radius then
			table.insert(pureCenterBacksArray, robot)
			pureCenterBacks[robot] = true
		elseif (target == countersideTargetLeft or target == countersideTargetRight) and needCountersideCB then
			countersideCenterBack = robot
			table.removeValue(unassigned, countersideCenterBack)
		elseif table.contains(self._oppsToMark, target) then
			markedOpps[target] = robot -- respect choice of task
			table.removeValue(unassigned, robot)
		end
	end

	if #pureCenterBacksArray == 1 then
		defaultCenterBack = pureCenterBacksArray[1]
		table.removeValue(unassigned, defaultCenterBack)
	elseif #pureCenterBacksArray == 0 then
		table.sort(unassigned, distToFriendlyGoal)
		defaultCenterBack = table.remove(unassigned, 1)
	end
	for _, robot in ipairs(self._oppsToMark) do
		if #unassigned == 0 then
			break
		end
		if not markedOpps[robot] then
			local markPos = Defense.manMarkPos(robot)
			table.sort(unassigned, function(r1, r2)
				return r1.pos:distanceTo(markPos) < r2.pos:distanceTo(markPos)
			end)
			local friendly = table.remove(unassigned, 1)
			markedOpps[robot] = friendly
			if pureCenterBacks[friendly] then
				table.removeValue(pureCenterBacksArray, friendly)
				table.removeValue(unassigned, friendly)
				if table.count(pureCenterBacks) < 2 then
					defaultCenterBack = pureCenterBacksArray[1]
					table.removeValue(unassigned, defaultCenterBack)
				end
			end
		end
	end

	if #unassigned > 0 then -- should only happen when there were too few to mark
		if #pureCenterBacksArray > 0 then
			defaultCenterBack = table.remove(pureCenterBacksArray, 1)
		else
			table.sort(unassigned, distToFriendlyGoal)
			defaultCenterBack = table.remove(unassigned, 1)
		end
	end
	if needCountersideCB and not countersideCenterBack then
		countersideCenterBack = table.remove(unassigned, 1)
	end

	for opp, manMarker in pairs(markedOpps) do
		self._send.roleAssignment(manMarker, { name = "ManMark", params = opp})
	end
	if defaultCenterBack then
		debug.set("default CenterBack", defaultCenterBack)
		self._send.roleAssignment(defaultCenterBack, { name = "CenterBack", params = World.Ball })
	end
	if countersideCenterBack then
		debug.set("counterside CenterBack", countersideCenterBack)
		local countersideTarget = World.Ball.pos.x > 0 and countersideTargetLeft or countersideTargetRight
		self._send.roleAssignment(countersideCenterBack, { name = "CenterBack", params = countersideTarget })
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

	if World.RefereeState ~= "Game" then
		self._oppFreeKickOngoing = false
	end

	local attackRatio
	if not self._customAttackRatio then
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
			self._oppFreeKickOngoing = true
			attackRatio = 1
		elseif World.RefereeState == "Stop" then
			attackRatio = 1
		elseif World.GameStage == "PenaltyShootout" then
			attackRatio = 6
		else -- Game, GameForce
			for _, robot in ipairs(World.FriendlyRobots) do
				if robot:hasBall(World.Ball) then
					self._oppFreeKickOngoing = false
					break
				end
			end
			if self._oppFreeKickOngoing then
				attackRatio = 1
			else
				attackRatio = self._ballInFriendlyFieldHalf and 3 or 2
			end
		end
	else
		attackRatio = self._customAttackRatio
	end


	local attackers = math.roundUpwards(attackRatio/6 * #World.FriendlyRobots, 0)

	if self._mainAttackerIsDefender then
		attackers = attackers - 1
	end

	if table.count(self._inbox.attackerRequest()) > 0 then
		attackers = attackers + 1
	end
	debug.set("AttackRatio", attackRatio)
	debug.set("#attackers", attackers)

	local defenders = #World.FriendlyRobots - attackers
	if World.FriendlyKeeper and World.FriendlyKeeper.isVisible then
		defenders = math.max(0, defenders - 1)
	end
	return attackers, defenders
end

local coord = nil
Entrypoints.add(" main", function()
	if not coord then
		coord = Coordinator.create()
	end
	coord:run()
end)
Entrypoints.add(" main aggressive", function()
	if not coord then
		coord = Coordinator.create()
	end
	coord._customAttackRatio = 6
	coord:run()
end)
Entrypoints.add(" main passive", function()
	if not coord then
		coord = Coordinator.create()
	end
	coord._customAttackRatio = 0
	coord:run()
end)

return Coordinator
