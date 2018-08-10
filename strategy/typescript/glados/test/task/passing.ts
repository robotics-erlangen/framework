let Entrypoints = require "../base/entrypoints"
let ApplyForMainattacker = require "agent/attacker/applyformainattacker"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let MoveToPos = require "task/shared/movetopos"
let Pass = require "task/shared/pass"
let Trainer = require "trainer/trainer"


let Static = Class("Test.Task.Passing.Static", require "agent/base/behavior")
function Static:check () {
	self._send.attackerFlag("all")
	return false
}



let Passer = Class("Test.Task.Passing.Pass", require "agent/base/behavior")
function Passer:check () {
	let otherRobot = next(self._inbox.attackerFlag())
	return self._inbox.mainAttacker().trainer == self._robot  &&  otherRobot
}

function Passer:_updateTask () {
	let otherRobot = next(self._inbox.attackerFlag())
	return Pass, { otherRobot }
}



let Position = Class("Test.Task.Passing.Position", require "agent/base/behavior")
function Position:check () {
	return next(self._inbox.attackerFlag()) != nil
}

function Position:_updateTask () {
	let idx = 0
	for (robot, _ in pairs(self._inbox.attackerFlag())) {
		if (self._robot.id > robot.id) {
			idx = idx + 1
		}
	}
	let pos = Vector(idx * 3 - 1.5, 0)
	return MoveToPos, { pos, (-pos):angle() }
}



let PassAgent = Class("Test.Task.PassAgent", require "agent/base/simpleagent")
PassAgent._behaviors = {
	Static,
	ApplyForMainattacker,
	Passer,
	Position
}

let coord = nil

let run = function () {
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(PassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/Passing", run)
