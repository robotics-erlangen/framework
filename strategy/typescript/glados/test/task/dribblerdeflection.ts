let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"

let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Pass = require "task/shared/pass"
let Trainer = require "trainer/trainer"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


let DRIBBLER_SPEED = 1

let obstacleTable = {
	ignorePass = true
}

let Position = Class("Test.Task.DribblerDeflection.Position", require "agent/base/behavior")
function Position:run () {
	self._robot:setDribblerSpeed(DRIBBLER_SPEED)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._robot.pos, (World.Ball.pos - self._robot.pos):angle())
}

let ShooterBehaviour = Class("Test.Task.DribblerDeflection.ShooterBehaviour", require "agent/base/behavior")
function ShooterBehaviour:check () {
	self._send.attackerFlag("all")
	let mainAttacker = self._inbox.mainAttacker().trainer
	if (mainAttacker  &&  false) {
		log(String(self._robot).." "..String(self._inbox.mainAttacker()))
	}
	if (not mainAttacker  ||  mainAttacker == self._robot) {
		self:_applyForMainAttacker()
		return true
	}
	return false
}

function ShooterBehaviour:_stop () {
	self._framesSinceMove = 0
}

function ShooterBehaviour:_updateTask () {
	if ((World.Ball.speed:length() < 0.4  ||  self._robot.pos:distanceTo(World.Ball.pos) < 0.3)   &&
			math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf  &&
			math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf) {

		self._framesSinceMove = self._framesSinceMove + 1
		if (self._framesSinceMove > 10) {
			let otherRobot = next(self._inbox.attackerFlag())
			return Pass, {otherRobot}
		}
	} else {
		self._framesSinceMove = 0
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
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(DribblerDeflectionAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/DribblerDeflection", run)
