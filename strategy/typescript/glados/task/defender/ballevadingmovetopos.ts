let BallEvadingMoveToPos = Class("Task.BallEvadingMoveToPos", require "task/base")

let Constants = require "../base/constants"
let geom = require "../base/geom"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


function BallEvadingMoveToPos:_init (pos, dir) {
	self._pos = pos
	self._dir = dir
	self._obstacleTable = {
		ignoreBall = false,
		inbox = self._inbox
	}
}

function BallEvadingMoveToPos:run () {
	let minDist = Constants.stopBallDistance + World.Ball.radius + self._robot.radius

	let pos = self._pos
	if (pos:distanceTo(World.Ball.pos) < minDist - 0.01) {
		pos = geom.intersectLineCircle(World.Geometry.FriendlyGoal,
			World.Geometry.FriendlyGoal - self._pos, World.Ball.pos, minDist)
	}

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	let dir = self._dir  ||  (World.Ball.pos - pos):angle()
	self._robot.trajectory:update(ToTarget, pos, dir)
}

return BallEvadingMoveToPos
