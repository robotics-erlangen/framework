local MoveToPos = (require "../base/class").new("Task.MoveToPos", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

Base._priority = 1

function MoveToPos:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function MoveToPos:_run()
	-- TODO: parameter erstellen
	
	self._robot.trajectory:update(ToTarget, parameter)
	
end

return MoveToPos
