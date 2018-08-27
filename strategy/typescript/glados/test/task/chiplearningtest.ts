import * as Entrypoints from "base/entrypoints";
import * as MathUtil from "base/mathutil";
import * as World from "base/world";
let Shoot = require "task/ability/shoot"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
let TestHelper = require "test/helper/agent"


let ChipLearningTest = Class("Test.Task.ChipLearningTest", require "task/base", Shoot)

let DO_LINEAR_SHOOT = true

let obstacleTable = {
	ignorePass = true
}

function ChipLearningTest:_init () {
	this._framesSinceMove = 0
	this._shootSpeed = 0
	this._shootPos = new Vector(0, 0)
	this._maxShootSpeed = 6
}

function ChipLearningTest:run () {
	let stayOnPos = false
	if ((World.Ball.speed.length() < 0.4 || this._robot.pos.distanceTo(World.Ball.pos) < 0.3)  && Math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf  &&
		Math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf) {
		this._framesSinceMove = this._framesSinceMove + 1
		if (this._framesSinceMove == 9) {
			let randX = World.Geometry.FieldWidthHalf * (MathUtil.random() * 2 - 1) * 0.8
			let randY = World.Geometry.FieldHeightHalf * (MathUtil.random() * 2 - 1) * 0.8
			this._shootPos = new Vector(randX, randY)
			this._shootSpeed = MathUtil.random() * this._maxShootSpeed
		}
		if (this._framesSinceMove < 10) {
			stayOnPos = true
		} else {
			// FIXME: broken call to this._shoot
			this._shoot(this._shootPos, this._shootSpeed, undefined, DO_LINEAR_SHOOT, 3 * Math.PI/180, false)
		}
	} else {
		this._framesSinceMove = 0
		stayOnPos = true
	}
	if (stayOnPos) {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
		this._robot.trajectory.update(ToTarget, this._robot.pos, Math.PI/2)
	}
}


let Agent = Class("Test.Task.ChipLearningTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ChipLearningTest, { 1 })
}


let run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ChipLearning", run)
