let Volley = Class("Test.Move.Volley", require "group/move/base")

import * as vis from "base/vis";
import * as World from "base/world";
let Freekick = require "agent/attacker/freekick"
let Stop = require "agent/attacker/stop"
let AcceptPass = require "task/attacker/acceptpass"
import {Striker} from "glados/task/attacker/striker";
import * as Attack from "glados/util/attack";

Volley.MIN_ROBOTS = 2
Volley.MAX_ROBOTS = 2

function Volley.canStart () {
	return World.RefereeState == "Stop" || World.RefereeState == "IndirectOffensive"
}

function Volley:_init () {
	this._freekickPos = new Vector(2.5, 3)
	this._startPos = new Vector(-2, 0)
	this._shootPos = new Vector(-2, 4)
	this._freekickFlag = false
}

function Volley:_canContinue () {
	return World.RefereeState == "Stop" || World.RefereeState == "IndirectOffensive"
}

function Volley:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		vis.addCircle("ball placement", this._freekickPos, 0.2, vis.colors.red)
		taskAssignments[this._robots[0]] = { behavior: Stop, restart: this._freekickFlag }
		this._freekickFlag = false
	} else {
		taskAssignments[this._robots[0]] = { behavior: Freekick, restart: not this._freekickFlag }
		this._freekickFlag = true
	}

	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	let startMoving = Attack.checkPassInfos(this._robots[1], passInfoTable, false)
	if (startMoving) {
		taskAssignments[this._robots[1]] = { class: AcceptPass }
	} else {
		taskAssignments[this._robots[1]] = { class: Striker, params: { this._startPos, this._shootPos } }
	}

	return taskAssignments, this._robots[0]
}

return Volley
