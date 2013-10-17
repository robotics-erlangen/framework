local Manual = (require "../base/class").new("Task.Manual", require "task/base")

local World = require "../base/world"
local Direct = require "trajectory/direct"

Manual.priority = 1

function Manual:_init()
end

function Manual:run()
	local input = self._robot.userControl
	self._robot.trajectory:update(Direct, input.speed, nil, input.omega)
end

return Manual
