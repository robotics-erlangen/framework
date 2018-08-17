import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
let TestHelper = require "test/helper/agent"

let obstacleTable = {
	ignorePass = true
}

let ShootSpeedTest = Class("Test.Task.ShootSpeedTest", require "task/base")

function ShootSpeedTest:_init (speed) {
	this._shootSpeed = speed
	this._ballInHalf = this._robot.pos.y * World.Ball.pos.y > 0
}

function ShootSpeedTest:run () {
	let ballInHalf = this._robot.pos.y * World.Ball.pos.y > 0
	let shootDistance = Math.max(0, Math.abs(this._robot.pos.y) - this._robot.shootRadius - World.Ball.radius)
	if (not ballInHalf && this._ballInHalf) {
		log("Ball speed:  Look at the raw values in the plotter")
		log("Shoot speed: "  +  String(this._robot.calculateShootSpeed(this._shootSpeed, Math.abs(this._robot.pos.y))))
		log("Distance:    "  +  String(shootDistance))
	}
	this._ballInHalf = ballInHalf

	let shootSpeed = this._robot.calculateShootSpeed(this._shootSpeed, shootDistance)
	this._robot.shoot(shootSpeed)
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot.trajectory.update(ToTarget, this._robot.pos, this._robot.pos.y < 0 ? Math.PI/2 : -Math.PI/2)
}


let Agent = Class("Test.Task.ShootSpeedTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ShootSpeedTest, { 2 })
}


let run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ShootSpeed", run)
