local Manual = (require "../base/class").new("Task.Manual", require "task/base")

local World = require "../base/world"
local UserInput = require "../base/userinput"
local Direct = require "trajectory/direct"

Manual.priority = 1

function Manual:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function Manual:run()
	local input = UserInput.getControlInput(self._robot)
	self._robot.trajectory:update(Direct, input.speed, nil, input.omega)
end

return Manual
