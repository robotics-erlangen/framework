let BallEscort = Class("Task.BallEscort", require "task/base")

import * as Field from "base/field";
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


let obstacleTable = {
	ignoreBall = false,
	extraBallDistance = 0.25,
	ignorePass = true,
}

function BallEscort:_init (opponentRobot) {
	this._opponentRobot = opponentRobot
}

function BallEscort:run () {
	let target = this._opponentRobot ? this._opponentRobot.pos : World.Geometry.FriendlyGoal
	let pos = World.Ball.pos + (target - World.Ball.pos).setLength(0.3 + this._robot.radius)

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
	if (ballOutPos) {
		this._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, ballOutPos.x, ballOutPos.y, this._robot.radius, "Ballescort", 68)
	}

	this._robot.trajectory.update(ToTarget, pos, (this._robot.pos - World.Ball.pos).angle())
}

return BallEscort
