local SuggestPass = require "task/ability/suggestpass"
local Victory = Class("Task.Victory", require "task/base", SuggestPass)

local ToTarget = require "trajectory/totarget"


function Victory:_init(center, startingAngle, angle, radius)
	assert(center and angle, "Missing Parameters for Victory-Task")
	self._center = center
	self._centerAngle = startingAngle
	self._outerAngle = angle
	self._radius = radius
	self._ticks = 1
	self._increment = true
end

function Victory:run()
	self._centerAngle = self._centerAngle + math.pi / 480
	self._outerAngle = self._outerAngle + math.pi / (180 + self._ticks*180)
	local origin = Vector.fromAngle(self._centerAngle):setLength(self._radius / 2)
	local pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
	if self._increment then
		self._ticks = self._ticks + 0.002
		self._increment = self._ticks < 1
	else
		self._ticks = self._ticks - 0.002
		self._increment = self._ticks < 0
	end
	self._robot.path:clearObstacles()
	local endSpeed = Vector(0, 0)
	self._robot.trajectory:update(ToTarget, pos, (self._center + origin - pos):angle(), 1, endSpeed)
end

return Victory
