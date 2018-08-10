let moveToBall = Class("Task.moveToBall", require "task/base")

let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let vis = require "../base/vis"


function moveToBall:_init (ballAddSpeed) {
	self._addspeed = ballAddSpeed  ||  0
	self._angleWeight = 1
	self._obstacleTable = {
		ignoreBall = true,
		ignorePass = true,
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = false,
	}
}

function moveToBall:run () {
	let ball = World.Ball
	let offset = (self._robot.pos - ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	offset.y = 0
	let pos = ball.pos - offset
	// self._robot.pos * 0.5 + ball.pos/2 - Vector(0, self._robot.radius/3) + ball.speed/10
	vis.addCircle("toball", pos, ball.pos:distanceTo(pos), vis.colors.redHalf, true)
	let dir = ball.pos - pos
	let dir2 = World.Geometry.OpponentGoal - pos
	dir = dir / dir2:lengthSq() + dir2 / dir:lengthSq()
	dir = dir:angle()

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)
	self._robot.trajectory:update(ToTarget, pos, dir, nil, ball.speed * 0.98 + Vector(dir2:setLength(0.1).x, self._addspeed))

}

return moveToBall
