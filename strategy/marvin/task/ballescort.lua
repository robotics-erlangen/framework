local BallEscort = Class("Task.BallEscort", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local obstacleTable = {
	ignoreBall = false,
	extraBallDistance = 0.3,
	ignorePass = true,
}

function BallEscort:_init(opponentRobot)
	self._opponentRobot = opponentRobot
end

function BallEscort:run()
	local pos = World.Ball.pos + (self._opponentRobot.pos - World.Ball.pos):setLength(0.2 + self._robot.radius)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	self._robot.trajectory:update(ToTarget, pos, (World.Ball.pos - self._robot.pos):angle())
end

return BallEscort
