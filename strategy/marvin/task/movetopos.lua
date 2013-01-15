local MoveToPos = (require "../base/class").new("Task.MoveToPos", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

MoveToPos.priority = 1

function MoveToPos:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function MoveToPos:_run()
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, self._pos, self._dir)
end

function MoveToPos.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		return MoveToPos.create(robot, Vector.create(0, 0), 0)
	end
end

return MoveToPos
