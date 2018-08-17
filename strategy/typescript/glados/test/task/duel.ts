import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
import {Duel} from "glados/task/shared/duel";
import {ShootGoal} from "glados/task/attacker/shootgoal";
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
		return ShootGoal //MoveToStaticBall, {1.5 * Math.PI, 0}
	}

}


let DuelAgent = Class("Test.Task.DuelAgent", require "agent/base/simpleagent")
DuelAgent._behaviors = {
	Dueler
}

let coord = nil

let run = function () {
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(DuelAgent, 1) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/Duel", run)
