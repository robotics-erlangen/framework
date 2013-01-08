local Mirror = (require "../base/class").new("Task.Mirror", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

Mirror.priority = 1


function Mirror:_init(targetRobot, distanceToCenterLine)
	self._targetRobot = targetRobot
	self._distance = distanceToCenterLine
end

function Mirror:_run()
	local pos = Vector.create(targetRobot.pos.x, -distance)

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, pos, math.pi/2)
end

return Mirror
