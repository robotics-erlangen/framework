let Volley = Class("Test.Move.Volley", require "group/move/base")

let vis = require "../base/vis"
let World = require "../base/world"
let Freekick = require "agent/attacker/freekick"
let Stop = require "agent/attacker/stop"
let AcceptPass = require "task/attacker/acceptpass"
let Striker = require "task/attacker/striker"
let Attack = require "util/attack"

Volley.MIN_ROBOTS = 2
Volley.MAX_ROBOTS = 2

function Volley.canStart () {
	return World.RefereeState == "Stop"  ||  World.RefereeState == "IndirectOffensive"
}

function Volley:_init () {
	self._freekickPos = Vector(2.5, 3)
	self._startPos = Vector(-2, 0)
	self._shootPos = Vector(-2, 4)
	self._freekickFlag = false
}

function Volley:_canContinue () {
	return World.RefereeState == "Stop"  ||  World.RefereeState == "IndirectOffensive"
}

function Volley:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		vis.addCircle("ball placement", self._freekickPos, 0.2, vis.colors.red)
		taskAssignments[self._robots[1]] = { behavior = Stop, restart = self._freekickFlag }
		self._freekickFlag = false
	} else {
		taskAssignments[self._robots[1]] = { behavior = Freekick, restart = not self._freekickFlag }
		self._freekickFlag = true
	}

	let _, passInfoTable = next(self._inbox.passInfo())
	let startMoving = Attack.checkPassInfos(self._robots[2], passInfoTable, false)
	if (startMoving) {
		taskAssignments[self._robots[2]] = { class = AcceptPass }
	} else {
		taskAssignments[self._robots[2]] = { class = Striker, params = { self._startPos, self._shootPos } }
	}

	return taskAssignments, self._robots[1]
}

return Volley
