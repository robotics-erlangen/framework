let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let TestHelper = require "test/helper/agent"

let obstacleTable = {
	ignorePass = true
}

let ShootSpeedTest = Class("Test.Task.ShootSpeedTest", require "task/base")

function ShootSpeedTest:_init (speed) {
	self._shootSpeed = speed
	self._ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
}

function ShootSpeedTest:run () {
	let ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
	let shootDistance = math.max(0, math.abs(self._robot.pos.y) - self._robot.shootRadius - World.Ball.radius)
	if (not ballInHalf  &&  self._ballInHalf) {
		log("Ball speed:  Look at the raw values in the plotter")
		log("Shoot speed: "  +  String(self._robot:calculateShootSpeed(self._shootSpeed, math.abs(self._robot.pos.y))))
		log("Distance:    "  +  String(shootDistance))
	}
	self._ballInHalf = ballInHalf

	let shootSpeed = self._robot:calculateShootSpeed(self._shootSpeed, shootDistance)
	self._robot:shoot(shootSpeed)
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._robot.pos, self._robot.pos.y < 0 ? math.pi/2 : -math.pi/2)
}


let Agent = Class("Test.Task.ShootSpeedTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ShootSpeedTest, { 2 })
}


let run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ShootSpeed", run)
