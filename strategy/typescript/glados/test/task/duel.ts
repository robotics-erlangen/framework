let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Duel = require "task/shared/duel"
let ShootGoal = require "task/attacker/shootgoal"
let Trainer = require "trainer/trainer"


// needs one yellow and one blue robot, must be run for both strategies
let Dueler = Class("Test.Task.Duel.Duel", require "agent/base/behavior")

function Dueler:check () {
	return true
}

function Dueler:_updateTask () {
	if (World.TeamIsBlue) {
		return Duel, {}
	} else {
		return ShootGoal //MoveToStaticBall, {1.5 * math.pi, 0}
	}

}


let DuelAgent = Class("Test.Task.DuelAgent", require "agent/base/simpleagent")
DuelAgent._behaviors = {
	Dueler
}

let coord = nil

let run = function () {
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(DuelAgent, 1) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/Duel", run)
