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

local inst = nil
function MoveToPos.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		inst = inst or MoveToPos.create(robot, Vector.create(0, 0), 0)
		return inst
	else
		inst = nil
	end
end

return MoveToPos
