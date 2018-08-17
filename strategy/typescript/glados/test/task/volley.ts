import * as Entrypoints from "base/entrypoints";
import * as Field from "base/field";
let Processor = require "+/base/processor"
import * as Referee from "base/referee";
import * as World from "base/world";
let ApplyForMainattacker = require "agent/attacker/applyformainattacker"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
import * as Ball from "glados/tobserver/ball";
import * as Robot from "glados/observer/robot";
import {Volley} from "glados/task/ability/volley";
import {MoveToPos} from "glados/task/shared/movetopos";
import {Pass} from "glados/task/shared/pass";
import {ShootGoal} from "glados/task/attacker/shootgoal";
let Trainer = require "trainer/trainer"

let Static = Class("Test.Task.Volley.Static", require "agent/base/behavior")
function Static:check () {
	this._send.attackerFlag("all")
	return false
}



let VolleyProcess = Class("Tesk.Task.Volley.VolleyProcess", require "+/base/process")
function VolleyProcess:init (robot) {
	this._isFinished = false
	this._ballSpeed = nil
	this._viewPos = nil
	this._targetPos = nil
	this._expectedTargetSpeed = nil
	this._hadBall = false
	this._robot = robot
}

function VolleyProcess:run () {
	// abort if another robot touches the ball or the ball has nearly stopped
	if (World.Ball.speed.length() < 1 || (Ball.friendlyBallOwner() != undefined ? Ball.friendlyBallOwner() != this._robot) : Ball.opponentBallOwner()) {
		this._isFinished = true
		return
	}

	if (not this._hadBall && Robot.touchedBall(this._robot, 0)) {
		log("hadBall")
		this._hadBall = true
	}
	// If ball has traveled the target distance or left the field
	if (this._hadBall && this._viewPos
			 &&  (World.Ball.pos.distanceTo(this._viewPos) > this._targetPos.distanceTo(this._viewPos)
			 ||  not Field.isInField(World.Ball.pos))) {
		let dirError = (World.Ball.pos - this._viewPos).angleDiff(this._targetPos - this._viewPos)
		let speedError = World.Ball.speed.length() - this._expectedTargetSpeed
		let volleyAngle = this._ballSpeed.angleDiff(this._targetPos - this._viewPos)/Math.PI*180

		let lowError = 1.5/180*Math.PI
		let lowSpeedError = 0.5
		let mu_x, mu_y = Volley.getParams()
		log(string.format("Old volley params %f %f", mu_x, mu_y))
		log(string.format("Volley angle %f", volleyAngle))
		if (Math.abs(dirError) > lowError) {
			mu_x = mu_x + 0.01 * MathUtil.sign(volleyAngle) * MathUtil.sign(dirError)
		} else if (Math.abs(speedError) > lowSpeedError) {
			mu_x = mu_x + 0.01 * MathUtil.sign(speedError)
			mu_y = mu_y + 0.01 * MathUtil.sign(speedError)
		}
		Volley.setParams(mu_x, mu_y)
		log(string.format("dirError %f speedError %f", dirError/Math.PI*180, speedError))
		log(string.format("Updated volley params %f %f", mu_x, mu_y))
		this._isFinished = true
	}
}

function VolleyProcess:isFinished () {
	return this._isFinished
}

function VolleyProcess:setData (ballSpeed, viewPos, targetPos, expectedTargetSpeed) {
	// only update parameters until the ball touched the robot
	if (this._hadBall) {
		return
	}
	this._ballSpeed = ballSpeed
	this._viewPos = viewPos
	this._targetPos = targetPos
	this._expectedTargetSpeed = expectedTargetSpeed
	//log(string.format("Data %s %s %s %f", ballSpeed, viewPos, targetPos, expectedTargetSpeed))
}


let ModShootGoal = Class("Test.Task.Volley.ModShootGoalTask", ShootGoal)
function ModShootGoal:_init (...) {
	ShootGoal._init(self, ...)
	this._analysisProcess = nil
}

function ModShootGoal:run () {
	if (this._analysisProcess != undefined && this._analysisProcess:isFinished()) {
		this._analysisProcess = nil
	}
	if (this._analysisProcess == undefined) {
		this._analysisProcess = VolleyProcess(this._robot)
		Processor.addPost(this._analysisProcess)
	}

	this._volleyObserver = function(...)
		this._analysisProcess:setData(...)
	}

	ShootGoal.run(self)
}


let Shooter = Class("Test.Task.Volley.Shooter", require "agent/base/behavior")
function Shooter:_stop () {
	this.lastPassReceiptTime = 0
}

function Shooter:check () {
	if (not next(this._inbox.attackerFlag())) {
		return false
	}

	if (this._inbox.mainAttacker().trainer != this._robot) {
		return false
	}

	if (Ball.receivesPass(this._robot)) {
		this.lastPassReceiptTime = World.Time
	}
	return World.Time - this.lastPassReceiptTime < 0.2
}

function Shooter:_updateTask () {
	return ModShootGoal
}


let Passer = Class("Test.Task.Volley.Passer", require "agent/base/behavior")
function Passer:check () {
	if (not next(this._inbox.attackerFlag())) {
		return false
	}

	if (this._inbox.mainAttacker().trainer != this._robot) {
		return false
	}

	return Referee.isFriendlyFreeKickState()
}

function Passer:_updateTask () {
	let targetRobot = next(this._inbox.attackerFlag())
	return Pass, {targetRobot, undefined, true}
}


let Position = Class("Test.Task.Volley.Position", require "agent/base/behavior")
function Position:check () {
	return next(this._inbox.attackerFlag()) != nil
}

function Position:_updateTask () {
	let idx = 0
	for (robot, _ in pairs(this._inbox.attackerFlag())) {
		if (this._robot.id > robot.id) {
			idx = idx + 1
		}
	}
	let x = World.Geometry.FieldWidthHalf * 2 / 3
	let y = World.Geometry.FieldHeightHalf * 1 / 4
	let pos = new Vector((idx * 2 - 1) * x, y)
	return MoveToPos, { pos, (World.Geometry.OpponentGoal - pos).angle() }
}


let PassAgent = Class("Test.Task.VolleyAgent", require "agent/base/simpleagent")
PassAgent._behaviors = {
	Static,
	ApplyForMainattacker,
	Shooter,
	Passer,
	Position
}

let coord = nil

let run = function () {
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(PassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/Volley", run)
