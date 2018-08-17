import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";

let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
import {Pass} from "glados/task/shared/pass";
let Trainer = require "trainer/trainer"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


let DRIBBLER_SPEED = 1

let obstacleTable = {
	ignorePass = true
}

let Position = Class("Test.Task.DribblerDeflection.Position", require "agent/base/behavior")
function Position:run () {
	this._robot:setDribblerSpeed(DRIBBLER_SPEED)

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot.trajectory.update(ToTarget, this._robot.pos, (World.Ball.pos - this._robot.pos).angle())
}

let ShooterBehaviour = Class("Test.Task.DribblerDeflection.ShooterBehaviour", require "agent/base/behavior")
function ShooterBehaviour:check () {
	this._send.attackerFlag("all")
	let mainAttacker = this._inbox.mainAttacker().trainer
	if (mainAttacker && false) {
		log(String(this._robot)+" "+String(this._inbox.mainAttacker()))
	}
	if (not mainAttacker || mainAttacker == this._robot) {
		this._applyForMainAttacker()
		return true
	}
	return false
}

function ShooterBehaviour:_stop () {
	this._framesSinceMove = 0
}

function ShooterBehaviour:_updateTask () {
	if ((World.Ball.speed.length() < 0.4 || this._robot.pos.distanceTo(World.Ball.pos) < 0.3)   &&
			Math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf  &&
			Math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf) {

		this._framesSinceMove = this._framesSinceMove + 1
		if (this._framesSinceMove > 10) {
			let otherRobot = next(this._inbox.attackerFlag())
			return Pass, {otherRobot}
		}
	} else {
		this._framesSinceMove = 0
	}
	return Position, {}
}

let PositionBehaviour = Class("Test.Task.DribblerDeflection.PositionBehaviour", require "agent/base/behavior")
function PositionBehaviour:check () {
	return true
}

function PositionBehaviour:_updateTask () {
	return Position, {}
}

let DribblerDeflectionAgent = Class("Test.Task.DribblerDeflectionAgent", require "agent/base/simpleagent")
DribblerDeflectionAgent._behaviors = {
	ShooterBehaviour,
	PositionBehaviour
}

let coord = nil

let run = function () {
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(DribblerDeflectionAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/DribblerDeflection", run)
