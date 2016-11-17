local Circuit = Class("Task.Circuit", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function Circuit:_init(center, angleOffset, radius)
	self._center = center
	self._angleOffset = angleOffset
	self._radius = radius or 0.5
end

function Circuit:run()
	local angle = (World.Time % 1000) % (math.pi*2) + self._angleOffset
	local pos = self._center + Vector.fromAngle(angle) * self._radius
	local dir = (World.Ball.pos - pos):angle()

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(ToTarget, pos, dir)
end

return Circuit
