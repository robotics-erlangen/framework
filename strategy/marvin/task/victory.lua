local SuggestPass = require "task/ability/suggestpass"
local Victory = Class("Task.Victory", require "task/base", SuggestPass)

local ToTarget = require "trajectory/totarget"


function Victory:_init(center, startingAngle, angle, radius)
	assert(center and angle, "Missing Parameters for Victory-Task")
	self._center = center
	self._centerAngle = startingAngle
	self._outerAngle = angle
	self._radius = radius
end

function Victory:run()
	log("Center: "..tostring(self._center))
	local endSpeed = Vector(0, 0)
	self._centerAngle = self._centerAngle + math.pi / 720
	self._outerAngle = self._outerAngle + math.pi / 360
	local origin = Vector.fromAngle(self._centerAngle):setLength(self._radius / 2)
	local pos = origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / 2 - 0.25)

	self._robot.path:clearObstacles()
	self._robot.trajectory:update(ToTarget, pos, (origin - pos):angle(), 1, endSpeed)
end

return Victory
