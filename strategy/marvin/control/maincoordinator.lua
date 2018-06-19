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
local MainTrainer = require "trainer/maintrainer"


function MainCoordinator:init(trainer)
	local pools = {
		attack = AgentPool(Agent.Attacker),
		manual = AgentPool(Agent.Manual),
		ally = AgentPool(Agent.Ally),
		keeper = AgentPool(Agent.Keeper),
		defense = AgentPool(Agent.Defender),
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
	local attackers, defenders = self._trainer:attackerDefenderDistribution()
	debug.set("#attackers", attackers)

	-- process pool change requests
	local changingRobots = self._trainer:changingRobots()
	for _, changingRobotEntry in ipairs(changingRobots) do
		self:_changeRobot(attackers, defenders,
			changingRobotEntry.robot, changingRobotEntry.isAttacker)
	end

	-- limit robot counts on attack/defense pool, causes automatic robot balancing
	self._pools.attack:setRobotLimit(attackers)
	self._pools.defense:setRobotLimit(defenders)
end


function MainCoordinator:_changeRobot(attackers, defenders, changingRobot, isAttacker)
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


local coord = nil
local function createCoordinator(mode)
	return function()
		if not coord then
			local trainer = MainTrainer(mode)
			coord = MainCoordinator(trainer)
		end
		coord:run()
	end
end

Entrypoints.add(" main", createCoordinator())
Entrypoints.add(" main aggressive", createCoordinator("aggressive"))
Entrypoints.add(" main passive", createCoordinator("passive"))

return MainCoordinator
