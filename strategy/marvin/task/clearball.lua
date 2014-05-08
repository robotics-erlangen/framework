local ClearBall = (require "../base/class").new("Task.ClearBall", require "task/base")

local World = require "../base/world"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"

ClearBall.priority = 4

function ClearBall:_init()
end


function ClearBall:_clearBall()
	local moveDest = Ball.toBall(self._robot, World.Ball)
	local viewDir = (World.Ball.pos - self._robot.pos):angle()

	self._robot.path:setDefaultObstacles(self._robot, true, false, false, self._robot.shootRadius)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, moveDest, viewDir)
	vis.addCircle("ClearBall", self._robot.pos, 0.15, vis.colors.redHalf, true)
end

return ClearBall