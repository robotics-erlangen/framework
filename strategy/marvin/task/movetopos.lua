local MoveToPos = Class("Task.MoveToPos", require "task/base")
local ToTarget = require "trajectory/totarget"

function MoveToPos:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function MoveToPos:run()
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, self._pos, self._dir)
end

return MoveToPos
