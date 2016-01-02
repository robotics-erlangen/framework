local Coordinator = require "control/coordinator"
local MainCoordinator = Class("Control.MainCoordinator", Coordinator)

local debug = require "../base/debug"
local Entrypoints = require "../base/entrypoints"
local vis = require "../base/vis"

local Agent = {
	Ally = require "agent/ally",
	Attacker = require "agent/attacker",
	Defender = require "agent/defender",
	Hidden = require "agent/hidden",
	Keeper = require "agent/keeper",
	Manual = require "agent/manual"
}

local AgentPool = require "control/agentpool"
local Trainer = require "trainer/maintrainer"


function MainCoordinator:init(mode)
	self._trainer = Trainer(mode)
	self._pools = {
		manual = AgentPool(Agent.Manual),
		ally = AgentPool(Agent.Ally),
		keeper = AgentPool(Agent.Keeper),
		defense = AgentPool(Agent.Defender),
		attack = AgentPool(Agent.Attacker),
		hidden = AgentPool(Agent.Hidden)
	}
	self._poolGroups = {
		{ self._pools.manual },
		{ self._pools.ally },
		{ self._pools.keeper },
		{ self._pools.defense, self._pools.attack },
		{ self._pools.hidden }
	}
end

function MainCoordinator:_postTrainerHook()
	-- the trainer inbox is empty after deliverMessages
	local attackers, defenders = self._trainer:attackRatio()
	debug.set("#attackers", attackers)
	-- only take one change request per frame
	local changingRobot = self._trainer:changingRobot()
	self:_updatePoolLimits(attackers, defenders, changingRobot)
end

function MainCoordinator:_updatePoolLimits(attackers, defenders, changingRobot)
	if changingRobot then
		-- kick the least suitable attacker
		self._pools.attack:setRobotLimit(attackers-1)
		self._pools.attack:cleanupRobots()
		-- ensure a new attacker can be added
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
end

local coord = nil
Entrypoints.add(" main", function()
	if not coord then
		coord = MainCoordinator()
	end
	coord:run()
end)
Entrypoints.add(" main aggressive", function()
	if not coord then
		coord = MainCoordinator("aggressive")
	end
	coord:run()
end)
Entrypoints.add(" main passive", function()
	if not coord then
		coord = MainCoordinator("passive")
	end
	coord:run()
end)

return MainCoordinator
