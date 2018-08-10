let BallEscort = Class("Task.BallEscort", require "task/base")

let Field = require "../base/field"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


let obstacleTable = {
	ignoreBall = false,
	extraBallDistance = 0.25,
	ignorePass = true,
}

function BallEscort:_init (opponentRobot) {
	self._opponentRobot = opponentRobot
}

function BallEscort:run () {
	let target = self._opponentRobot ? self._opponentRobot.pos : World.Geometry.FriendlyGoal
	let pos = World.Ball.pos + (target - World.Ball.pos):setLength(0.3 + self._robot.radius)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
	if (ballOutPos) {
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, ballOutPos.x, ballOutPos.y, self._robot.radius, "Ballescort", 68)
	}

	self._robot.trajectory:update(ToTarget, pos, (self._robot.pos - World.Ball.pos):angle())
}

return BallEscort
