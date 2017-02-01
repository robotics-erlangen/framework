local Coordinator = require "control/coordinator"
local MainCoordinator = Class("Control.MainCoordinator", Coordinator)

local debug = require "../base/debug"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

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
	local trainer = Trainer(mode)
	local pools = {
		manual = AgentPool(Agent.Manual),
		ally = AgentPool(Agent.Ally),
		keeper = AgentPool(Agent.Keeper),
		defense = AgentPool(Agent.Defender),
		attack = AgentPool(Agent.Attacker),
		hidden = AgentPool(Agent.Hidden)
	}
	local poolGroups = {
		{ pools.manual },
		{ pools.ally },
		{ pools.keeper },
		{ pools.defense, pools.attack },
		{ pools.hidden }
	}
	Coordinator.init(self, trainer, pools, poolGroups)
end

function MainCoordinator:_postTrainerHook()
	-- the trainer inbox is empty after deliverMessages
	local attackers, defenders = self._trainer:attackRatio()
	debug.set("#attackers", attackers)
	-- only take one change request per frame
	local changingRobot, isAttacker = self._trainer:changingRobot()
	self:_updatePoolLimits(attackers, defenders, changingRobot, isAttacker)
end

function MainCoordinator:_updatePoolLimits(attackers, defenders, changingRobot, isAttacker)
	if changingRobot then
		local oldPool = isAttacker and "attack" or "defense"
		local newPool = isAttacker and "defense" or "attack"
		local poolLimit = isAttacker and defenders or attackers

		-- kick the least suitable robot
		self._pools[newPool]:setRobotLimit(poolLimit-1)
		self._pools[newPool]:cleanupRobots()
		-- ensure a new robot can be added
		self._pools[newPool]:setRobotLimit(poolLimit)

		if self._pools[oldPool]:removeRobot(changingRobot) then
			self._pools[newPool]:takeRobot({changingRobot}, self._messaging)
		elseif changingRobot ~= World.FriendlyKeeper then
			error("invalid pool change request from " .. changingRobot.id)
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
