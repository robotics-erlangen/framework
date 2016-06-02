local Error = Class("Task.Error", require "task/base")
local Direct = require "trajectory/direct"

function Error:run()
	self._robot.trajectory:update(Direct, Vector(0, 0), nil, 2*math.pi)
end

return Error
