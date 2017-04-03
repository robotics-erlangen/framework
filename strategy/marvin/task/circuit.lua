local Circuit = Class("Task.Circuit", require "task/base", require "task/ability/suggestpass")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function Circuit:_init(center, angleOffset, radius, passPos)
	self._center = center
	self._angleOffset = angleOffset
	self._radius = radius or 0.5
	self._passPos = passPos
end

function Circuit:run()
	local angle = (World.Time % 1000) % (math.pi*2) + self._angleOffset
	local pos = self._center + Vector.fromAngle(angle) * self._radius
	local dir = (World.Ball.pos - pos):angle()

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(ToTarget, pos, dir)

	if self._passPos then
		self:_suggestPass(self._passPos)
	end
end

return Circuit
