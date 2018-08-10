let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"
let Shoot = require "task/ability/shoot"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let TestHelper = require "test/helper/agent"


let ChipLearningTest = Class("Test.Task.ChipLearningTest", require "task/base", Shoot)

let DO_LINEAR_SHOOT = true

let obstacleTable = {
	ignorePass = true
}

function ChipLearningTest:_init () {
	self._framesSinceMove = 0
	self._shootSpeed = 0
	self._shootPos = Vector(0, 0)
	self._maxShootSpeed = 6
}

function ChipLearningTest:run () {
	let stayOnPos = false
	if ((World.Ball.speed:length() < 0.4  ||  self._robot.pos:distanceTo(World.Ball.pos) < 0.3)   &&  math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf  &&
		math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf) {
		self._framesSinceMove = self._framesSinceMove + 1
		if (self._framesSinceMove == 9) {
			let randX = World.Geometry.FieldWidthHalf * (math.random() * 2 - 1) * 0.8
			let randY = World.Geometry.FieldHeightHalf * (math.random() * 2 - 1) * 0.8
			self._shootPos = Vector(randX, randY)
			self._shootSpeed = math.random() * self._maxShootSpeed
		}
		if (self._framesSinceMove < 10) {
			stayOnPos = true
		} else {
			// FIXME: broken call to self:_shoot
			self:_shoot(self._shootPos, self._shootSpeed, nil, DO_LINEAR_SHOOT, 3 * math.pi/180, false)
		}
	} else {
		self._framesSinceMove = 0
		stayOnPos = true
	}
	if (stayOnPos) {
		PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
		self._robot.trajectory:update(ToTarget, self._robot.pos, math.pi/2)
	}
}


let Agent = Class("Test.Task.ChipLearningTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ChipLearningTest, { 1 })
}


let run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ChipLearning", run)
