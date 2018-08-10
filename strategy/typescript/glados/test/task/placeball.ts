let Entrypoints = require "../base/entrypoints"
let PlaceBall = require "task/attacker/placeball"
let Coordinator = require "control/coordinator"
let Trainer = require "trainer/trainer"
let AgentPool = require "control/agentpool"

let Placer = Class("Test.Task.PlaceBall.Placer", require "agent/base/behavior")

function Placer:check () {
	return true
}

function Placer:_updateTask () {
	return PlaceBall
}

let PlacerAgent = Class("Test.Task.PlaceBall.PlacerAgent", require "agent/base/simpleagent")
PlacerAgent._behaviors = {
	Placer
}

let coord = nil

let run = function () {
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(PlacerAgent, 1) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/PlaceBall", run)
