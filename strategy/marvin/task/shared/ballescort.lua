local BallEscort = Class("Task.BallEscort", require "task/base")

local Field = require "../base/field"
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
	local target = self._opponentRobot and self._opponentRobot.pos or World.Geometry.FriendlyGoal
	local pos = World.Ball.pos + (target - World.Ball.pos):setLength(0.2 + self._robot.radius)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	local ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
	if ballOutPos then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, ballOutPos.x, ballOutPos.y, self._robot.radius, "Ballescort", 68)
	end

	self._robot.trajectory:update(ToTarget, pos, (World.Ball.pos - self._robot.pos):angle())
end

return BallEscort
