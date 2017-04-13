local BallEscort = Class("Task.BallEscort", require "task/base")

local geom = require "../base/geom"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local PathHelper = require "trajectory/pathhelper"


function BallEscort:_init(opponentRobot)
	self._opponentRobot = opponentRobot
end

function BallEscort:run()
	local pos = World.Ball.pos + (self._opponentRobot.pos - World.Ball.pos):setLength(0.2+self._robot.radius*2)

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot, nil, nil, nil, nil, nil, nil, nil, 0.3)

	self._robot.trajectory:update(ToTarget, pos, (World.Ball.pos - self._robot.pos):angle())
end

return BallEscort
