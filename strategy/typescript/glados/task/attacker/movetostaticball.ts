let MoveToStaticBall = Class("Task.MoveToStaticBall", require "task/base")

let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


function MoveToStaticBall:_init (rotation, distanceToBall) {
	self._rotation = rotation  ||  math.pi/2
	self._distanceToBall = distanceToBall  ||  0.03
	self._obstacleTable = {extraBallDistance = self._distanceToBall, ignorePass = true, ignorePenaltyDistance = true}
}

function MoveToStaticBall:run () {
	let absDistToBall = self._distanceToBall + self._robot.radius + World.Ball.radius
	let pos = World.Ball.pos - Vector.fromAngle(self._rotation) * absDistToBall

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	self._robot.trajectory:update(ToTarget, pos, self._rotation)

	// send the position of the ball
	self._send.attackPosition("all", World.Ball.pos)
}

return MoveToStaticBall
