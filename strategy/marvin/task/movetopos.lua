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

function MoveToPos.factory(position, pos, dir)
	local f = function (robots)
		return MoveToPos.create(robots[position], pos, dir)
	end
	return f
end

function MoveToPos.test(id)
	if id > 2 then
		return nil
	end
	return MoveToPos.factory(1, Vector.create(0, id), 0), 1
end

return MoveToPos
