local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Duel = require "task/duel"
local MoveToStaticBall = require "task/movetostaticball"
local Trainer = require "trainer/trainer"
local ShootGoal = require "task/shootgoal"
 

-- needs one yellow and one blue robot, must be run for both strategies

local Dueler = Class("Test.Task.Duel.Duel", require "agent/base/behavior")
function Dueler:check()
	return true
end

function Dueler:_updateTask()
	local otherRobot = next(self._inbox.attackerFlag())
	if World.TeamIsBlue then
		return Duel, {}
	else
		return ShootGoal --MoveToStaticBall, {1.5 * math.pi, 0}
	end
	
end


local DuelAgent = Class("Test.Task.DuelAgent", require "agent/base/simpleagent")
DuelAgent._behaviors = {
	Dueler
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(DuelAgent, 1) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/Duel", run)
