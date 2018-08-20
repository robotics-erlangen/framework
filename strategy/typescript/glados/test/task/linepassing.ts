import * as Entrypoints from "base/entrypoints";
let Vector = require "+/base/vector"
import * as World from "base/world";
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import {Pass} from "glados/task/shared/pass";
let Trainer = require "trainer/trainer"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";

//The x coordinates of the lines the robots will return to
let RETURN_LINES = {1.5,-1.5}

//For now, linepassing will only work properly when all robots of the other team are disabled
let lastShotBy = nil

// whether or not to do regular linpassing or a catch ball test
let catchBallTest = false

let Static = Class("Test.Task.LinePassing.Static", require "agent/base/behavior")
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



let Passer = Class("Test.Task.LinePassing.Pass", require "agent/base/behavior")
function Passer:check () {
	let otherRobot = next(this._inbox.attackerFlag())
	return this._inbox.mainAttacker().trainer == this._robot && otherRobot
}


function Passer:_updateTask () {
	let otherRobot = next(this._inbox.attackerFlag())
	return Pass, { otherRobot }
}


let obstacleTable = {
	ignorePass = true
}

let MoveToRandom = Class("Test.Task.LinePassing.MoveToRandom", require "task/base")
function MoveToRandom:_init () {
	this._ypos = (Math.random() - 0.5) * 2 * (World.Geometry.FieldHeightHalf - 1)
}

function MoveToRandom:run () {
	// get the robot index
	let idx = 1
	for (robot, _ in pairs(this._inbox.attackerFlag())) {
		if (this._robot.id > robot.id) {
			idx = idx + 1
		}
	}
	let mainAttacker = this._inbox.mainAttacker().trainer

	// position where the robot wants the ball
	let passPos = new Vector(RETURN_LINES[idx], this._ypos)
	let timeOnPos = Physics.robotTimeToPos(this._robot, passPos,
			(passPos - this._robot.pos).setLength(this._robot.maxSpeed)) + World.Time

	// move to pass pos
	let targetPos = passPos
	let linePos = new Vector(RETURN_LINES[idx], this._robot.pos.y)
	if (linePos.distanceTo(this._robot.pos) > 0.3
			// only move if the attacker is near the ball, this ensures that we still move when the attacker gets to the ball
			 ||  mainAttacker && mainAttacker.pos.distanceTo(World.Ball.pos) > 0.5) {
		// return to line before wanting a pass
		timeOnPos = Infinity
		targetPos = linePos
	}

	// notify attacker
	if (mainAttacker) {
		let modifiedPos = passPos
		if (catchBallTest) {
			modifiedPos = targetPos - new Vector(0,MathUtil.sign(targetPos.y)*0.5)
		}
		this._send.passSuggestion("all", { ballPos = modifiedPos, time = timeOnPos })
	}

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	this._robot.trajectory.update(ToTarget, targetPos, (-targetPos).angle())
}


let Position = Class("Test.Task.LinePassing.Position", require "agent/base/behavior")
function Position:check () {
	let otherRobot = next(this._inbox.attackerFlag())
	return otherRobot
}

function Position:_updateTask () {
	return MoveToRandom, {}
}



let LinePassAgent = Class("Test.Task.LinePassAgent", require "agent/base/simpleagent")
LinePassAgent._behaviors = {
	Static,
	Passer,
	Position
}

let coord = nil

let run = function () {
	catchBallTest = false
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(LinePassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

let runCatchBall = function () {
	catchBallTest = true
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(LinePassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/LinePassing", run)
Entrypoints.add("TaskTest/LinePassing(CatchBall)", runCatchBall)
