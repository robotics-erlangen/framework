let BallEvadingMoveToPos = Class("Task.BallEvadingMoveToPos", require "task/base")

import * as Constants from "base/constants";
import * as geom from "base/geom";
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


function BallEvadingMoveToPos:_init (pos, dir) {
	this._pos = pos
	this._dir = dir
	this._obstacleTable = {
		ignoreBall = false,
		inbox = this._inbox
	}
}

function BallEvadingMoveToPos:run () {
	let minDist = Constants.stopBallDistance + World.Ball.radius + this._robot.radius

	let pos = this._pos
	if (pos.distanceTo(World.Ball.pos) < minDist - 0.01) {
		pos = geom.intersectLineCircle(World.Geometry.FriendlyGoal,
			World.Geometry.FriendlyGoal - this._pos, World.Ball.pos, minDist)
	}

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	let dir = this._dir || (World.Ball.pos - pos).angle()
	this._robot.trajectory.update(ToTarget, pos, dir)
}

return BallEvadingMoveToPos
