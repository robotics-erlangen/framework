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
local AgentPool = require "control/agentpool"
local Messaging = require "control/messaging"
local debug = require "../base/debug"

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
	self.specialRoles = {} -- remember roles
	self._messages = nil
end

function Coordinator:run()
	self:_updatePoolRobots()
	-- TODO: facilities for learning
	
	self._messages = Messaging.getSpecialRoleApplications()
	debug.pushtop("Role Applications")
	for role, application in pairs(self._messages) do
		debug.push(role)
		for robot, rating in pairs(application) do
			debug.set(robot.id, rating)
		end
		debug.pop() -- role
	end
	debug.pop() -- Role Applications
	self:_chooseSpecialRoles()
	Messaging.deliverMessages()

	-- run every pool and thus every agent
	for _, pool in pairs(self._pools) do
		pool:run()
	end
end

function Coordinator:_updatePoolRobots()
	-- calculate how many robots to use for attack / defense with hysteresis
	local attackRatio = self:observeGameState()
	local attackers = attackRatio/6 * #World.FriendlyRobots
	attackers = math.roundUpwards(attackers, 0)
	local defenders = #World.FriendlyRobots - attackers
	
	-- if keeper is on the field, it is managed by the keeper pool
	if World.FriendlyKeeper and World.FriendlyKeeper.isVisible then
		defenders = defenders - 1
	end
	
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

--- chooses a robot for every specialRole and sends a message to it
function Coordinator:_chooseSpecialRoles()
	local hysteresis = 0.1 -- magic constant
	local roleApplications = Messaging.getSpecialRoleApplications()

	for role, applications in pairs(roleApplications) do
		local bestRobot = nil
		local bestRating = -1
		for robot, rating in pairs(applications) do
			if self.specialRoles[role] == robot then
				rating = rating + hysteresis
			end
			if not self.specialRoles[role] or rating > bestRating then
				bestRobot = robot
				bestRating = rating
			end
		end
		if bestRobot then
			self.specialRoles[role] = bestRobot
		end
		Messaging.sendSpecialRole(role, self.specialRoles[role])				
	end
end

function Coordinator:observeGameState()
	-- original thoughts:
	-- if opponent has ball and is in our half -> 5 defenders
	-- if opponent has ball and is in his half -> 3-4 defenders
	-- if we have ball in our half -> 3-4 defenders
	-- if we have ball in opponent half -> 3 defenders
	-- if we are in the opponent half and we've got a freekick -> 2-3 defenders
	
	-- ===== distribution table =====
	-- formula: ratio{0, 1, 2, 3, 4, 5, 6} / 6 * robots, round up at 0.5
	-- previous formula: ratio{0, 0.2, 0.3, 0.5, 0.7, 0.8, 1} * robots, round up at 0.4
	-- 
	-- 
	-- #attackers depending on #robots and attackRatio
	-- the + denotes, that the previous formula would have had an attacker more than the new one
	--
	--		ratio:	0	1	2	3	4	5	6
	--				
	-- 1 robot		0	0	0	1	1	1	1
	-- 2 robots		0	0+	1	1	1+	2	2
	-- 3 robots		0	1	1	2	2	3	3
	-- 4 robots		0	1	1	2	3	3	4
	-- 5 robots		0	1	2	3	3+	4	5
	-- 6 robots		0	1	2	3	4	5	6
	-- 7 robots		0	1+	2	4	5	6	7
	-- 8 robots		0	1+	3	4	5+	7	8
	-- 

	-- ===== current implementation =====
	-- General (ie Game, Stop)
	-- 3/3 if Ball is at opponent field half (self._front == true)
	-- 2/4 if Ball is at our field half
	-- 
	-- Kickoff Offensive
	-- 4/2
	-- Kickoff Defensive
	-- 3/3
	-- 
	-- Goal-Kick Offensive
	-- 3/3
	-- Goal-Kick Defensive
	-- 2/4
	-- 
	-- Corner-Kick Offensive
	-- 4/2
	-- Corner-Kick Defensive
	-- 1/5
	-- 
	-- Throw-In Offensive
	-- 3/3
	-- Throw-In Defensive
	-- 2/4
	-- 
	-- Penalty Shootout
	-- 6/0

	-- Calculations
	if self._front == nil then
		self._front = false
	end
	if self._front and World.Ball.pos.y < -0.5 or not self._front and World.Ball.pos.y > 0.5 then
		self._front = not self._front
	end
	local friendlyCorner = Field.isInOwnCorner(World.Ball.pos, false)
	local opponentCorner = Field.isInOwnCorner(World.Ball.pos, true)
	
	-- General
	local attackRatio = self._front and 3 or 2	
	
	-- Kickoff
	if World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive" then
		attackRatio = 4
	elseif World.RefereeState == "KickoffDefensivePrepare" or World.RefereeState == "KickoffDefensive" then
		attackRatio = 3
		
	-- FreeKick
	elseif World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive" then
		if friendlyCorner then
			attackRatio = 3
		elseif opponentCorner then
			attackRatio = 4
		else
			attackRatio = 3
		end
	elseif World.RefereeState == "DirectDefensive" or World.RefereeState == "IndirectDefensive" then
		if friendlyCorner then
			attackRatio = 1
		elseif opponentCorner then
			attackRatio = 2
		else
			attackRatio = 2
		end
	end
	
	-- Penalty Shootout
	if World.GameStage == "PenaltyShootout" then
		attackRatio = 6
	end
	
	debug.set("AttackRatio", attackRatio)
	return attackRatio
end

local coord = nil
Entrypoints.add("‏ main", function()
	if not coord then
		coord = Coordinator.create()
	end
	coord:run()
end)

return Coordinator
