local Entrypoints = require "../base/entrypoints"
local PlaceBall = require "task/placeball"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"
local AgentPool = require "control/agentpool"

local Placer = Class("Test.Task.PlaceBall.Placer", require "agent/base/behavior")

function Placer:check()
	return true
end

function Placer:_updateTask()
	return PlaceBall
end

local PlacerAgent = Class("Test.Task.PlaceBall.PlacerAgent", require "agent/base/simpleagent")
PlacerAgent._behaviors = {
	Placer
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(PlacerAgent, 1) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/PlaceBall", run)
