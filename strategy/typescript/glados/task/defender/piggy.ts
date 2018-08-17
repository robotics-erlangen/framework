let Piggy = Class("Task.Piggy", require "task/base")

import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";

function Piggy:_init (targetRobot) {
	assert(targetRobot, "Piggy task needs a target robot")
	this._targetRobot = targetRobot
}

function Piggy:run () {
	let obstacleTable = { inbox = this._inbox}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	let piggyPos = UtilDefense.piggyPos(this._targetRobot)

	this._send.moveDest("all", piggyPos)

	let dir = (World.Ball.pos - this._targetRobot.pos).angle()
	this._robot.trajectory.update(ToTarget, piggyPos, dir, undefined, this._targetRobot.speed)
}

return Piggy
