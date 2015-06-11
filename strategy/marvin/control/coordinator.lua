local Agent = {
	Attacker = require "agent/attacker",
	Defender = require "agent/defender",
	Keeper = require "agent/keeper",
	Hidden = require "agent/hidden",
	Manual = require "agent/manual"
}
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
local Trainer = require "trainer/base"

local Coordinator = Class("Control.Coordinator")

function Coordinator:init(mode)
	self._trainer = Trainer(mode)
	self._pools = {
		manual = AgentPool(Agent.Manual),
		keeper = AgentPool(Agent.Keeper),
		defense = AgentPool(Agent.Defender),
		attack = AgentPool(Agent.Attacker),
		hidden = AgentPool(Agent.Hidden)
	}
	self._poolGroups = {
		{ self._pools.manual },
		{ self._pools.keeper },
		{ self._pools.defense, self._pools.attack },
		{ self._pools.hidden }
	}
end

function Coordinator:run()
	self._trainer:run()

	-- the trainer inbox is empty after deliverMessages
	local attackers, defenders = self._trainer:attackRatio()
	debug.set("#attackers", attackers)
	-- only take one request per frame
	local changingRobot = self._trainer:changingRobot()

	Messaging.deliverMessages()
	self:_updatePoolRobots(attackers, defenders, changingRobot)
	-- run every pool and thus every agent
	for _, pool in pairs(self._pools) do
		pool:run()
	end
end

function Coordinator:_updatePoolRobots(attackers, defenders, changingRobot)
	if changingRobot then
		-- kick the least suitable attacker
		self._pools.attack:setRobotLimit(attackers-1)
		self._pools.attack:cleanupRobots()
		self._pools.attack:setRobotLimit(attackers)
		if self._pools.defense:removeRobot(changingRobot) then
			self._pools.attack:takeRobot({changingRobot})
		else
			error("pool change request from non-defender " .. changingRobot.id)
		end
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

local coord = nil
Entrypoints.add(" main", function()
	if not coord then
		coord = Coordinator()
	end
	coord:run()
end)
Entrypoints.add(" main aggressive", function()
	if not coord then
		coord = Coordinator("aggressive")
	end
	coord:run()
end)
Entrypoints.add(" main passive", function()
	if not coord then
		coord = Coordinator("passive")
	end
	coord:run()
end)

return Coordinator
