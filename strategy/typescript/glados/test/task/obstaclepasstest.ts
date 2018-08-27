import * as Entrypoints from "base/entrypoints";
import * as MathUtil from "base/mathutil";
let Vector = require "+/base/vector"
import * as World from "base/world";
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
import * as Ball from "glados/observer/ball";
import {MoveToPos} from "glados/task/shared/movetopos";
import {Pass} from "glados/task/shared/pass";
import {Striker} from "glados/task/attacker/striker";
let Trainer = require "trainer/trainer"


let lastShotBy = nil

let Static = Class("Test.Task.ObstaclePassing.Static", require "agent/base/behavior")
function Static:check () {
	this._send.attackerFlag("all")
	let lastRobot = Ball.isShot()
	if (lastRobot) {
		lastShotBy = lastRobot
	}
	if (this._robot != lastShotBy) {
		this._applyForMainAttacker()
	}
	return false
}



let Passer = Class("Test.Task.ObstaclePassing.Pass", require "agent/base/behavior")
function Passer:check () {
	let otherRobot = next(this._inbox.attackerFlag())
	return this._inbox.mainAttacker().trainer == this._robot && otherRobot
}


function Passer:_updateTask () {
	let otherRobot = next(this._inbox.attackerFlag())
	return Pass, { otherRobot }
}


let Position = Class("Test.Task.ObstaclePassing.Position", require "agent/base/behavior")
function Position:check () {
	let otherRobot = next(this._inbox.attackerFlag())
	return otherRobot
}

function Position:_updateTask () {
	return Striker, {}
}

let ObstaclePassAgent = Class("Test.Task.ObstaclePassAgent", require "agent/base/simpleagent")
ObstaclePassAgent._behaviors = {
	Static,
	Passer,
	Position
}

let RETURN_LINES = {1.5,-1.5}

let DriveToRandom = Class("Test.Task.ObstaclePassing.DriveToRandom", require "agent/base/behavior")
function DriveToRandom:_stop () {
	this._randomPos = new Vector((MathUtil.random()-0.5)* 2 * (RETURN_LINES[1]-0.2),
							(MathUtil.random()-0.5) * 2 * (World.Geometry.FieldHeightHalf-1))
}

function DriveToRandom:check () {
	return true
}


function DriveToRandom:_updateTask () {
	return MoveToPos, { this._randomPos, (-this._randomPos).angle() }
}

let RandomPosAgent = Class("Test.Task.RandomPosAgent", require "agent/base/simpleagent")
RandomPosAgent._behaviors = {
	DriveToRandom
}

let coord = nil

let run = function () {
	if (coord == undefined) {
		let trainer = Trainer()
		let pools
		if (World.TeamIsBlue) {
			// these robots do the passing
			pools = { pass = AgentPool(ObstaclePassAgent, 2) }
		} else {
			// just position the robots randomly
			pools = { pass = AgentPool(RandomPosAgent, 4) }
		}
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/ObstaclePassing", run)
