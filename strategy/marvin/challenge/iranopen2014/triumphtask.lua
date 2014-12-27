local Triumph = Class("Task.Triumph", require "task/base")
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

Triumph.priority = 5 -- no meaning
Triumph.i = 0
Triumph.j = 0

local points = {
	Vector(-1, -2.5),
	Vector(1, -2.5),
	Vector(1, -0.5),
	Vector(-1, -0.5),
}

function Triumph:_init(num)
	if num < 1 or num > 4 then
		error("invalid num")
	end

	self._num = num
	self._moveDest = points[num]
	self._limit = 0.05
end

function Triumph:run()
	if World.RefereeState == "Stop" then
		if self._robot.pos:distanceTo(self._moveDest) < self._limit then
			if not self._ready then
				Triumph.i = Triumph.i + 1
			end
			self._ready = true
		end
		if Triumph.i == 4 then
			Triumph.j = 0
		end
		if Triumph.j < 4 then
			self._num = self._num + 1
			if self._num > 4 then self._num = 1 end
			self._moveDest = points[self._num]
			Triumph.j = Triumph.j + 1
			Triumph.i = 0
			self._ready = false
		end
--		log(Triumph.i .. "  " .. Triumph.j)
	end
	self._robot.path:setDefaultObstacles(self._robot, true, true, true)
	self._robot.trajectory:update(ToTarget, self._moveDest, math.pi/2 * (self._num+2), 0.6)
end

return Triumph
