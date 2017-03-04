local Error = Class("Task.Error", require "task/base")
local World = require "../base/world"
local Direct = require "trajectory/direct"
local ToTarget = require "trajectory/totarget"

local EXCHANGE_TARGET = Vector(World.Geometry.FieldWidthHalf - 1, -1)

function Error:run()
	if self._robot.pos:distanceTo(EXCHANGE_TARGET) > 0.5 then
		self._robot.trajectory:update(ToTarget, EXCHANGE_TARGET, 0)
	else
		self._robot.trajectory:update(Direct, Vector(0, 0), nil, 2*math.pi)
	end
end

return Error
