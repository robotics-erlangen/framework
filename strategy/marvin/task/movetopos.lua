local MoveToPos = Class("Task.MoveToPos", require "task/base")

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function MoveToPos:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function MoveToPos:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(ToTarget, self._pos, self._dir)
end

return MoveToPos
