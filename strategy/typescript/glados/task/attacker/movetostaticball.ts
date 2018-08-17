let MoveToStaticBall = Class("Task.MoveToStaticBall", require "task/base")

import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


function MoveToStaticBall:_init (rotation, distanceToBall) {
	this._rotation = rotation || Math.PI/2
	this._distanceToBall = distanceToBall || 0.03
	this._obstacleTable = {extraBallDistance = this._distanceToBall, ignorePass = true, ignorePenaltyDistance = true}
}

function MoveToStaticBall:run () {
	let absDistToBall = this._distanceToBall + this._robot.radius + World.Ball.radius
	let pos = World.Ball.pos - Vector.fromAngle(this._rotation) * absDistToBall

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	this._robot.trajectory.update(ToTarget, pos, this._rotation)

	// send the position of the ball
	this._send.attackPosition("all", World.Ball.pos)
}

return MoveToStaticBall
