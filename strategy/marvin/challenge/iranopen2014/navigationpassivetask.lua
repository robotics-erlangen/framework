local NavigationPassive = Class("Task.NavigationChallengePassive", require "task/base")
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

NavigationPassive.priority = 5 -- no meaning

function NavigationPassive:_init(num)
	if num == 1 or num == 6 then
		self._yLine = -1
	elseif num == 2 or num == 5 then
		self._yLine = 0
	elseif num == 3 or num == 4 then
		self._yLine = 1
	else
		error("invalid number " .. num .. " in constructor")
	end
	local safetyDistance = Settings.positionPadding + self._robot.radius
	if num <= 3 then
		self._xMin = -World.Geometry.FieldWidthHalf + safetyDistance
		self._xMax = -World.Geometry.FieldWidthHalf + 1 - safetyDistance
	else
		self._xMin = World.Geometry.FieldWidthHalf - 1 + safetyDistance
		self._xMax = World.Geometry.FieldWidthHalf - safetyDistance
	end
	self._moveDest = Vector.create(self._xMin + math.random()*(self._xMax-self._xMin), self._yLine)
end

function NavigationPassive:run()
	if self._robot.pos:distanceTo(self._moveDest) < 0.05 then
		self._moveDest = Vector.create(self._xMin + math.random()*(self._xMax-self._xMin), self._yLine)
	end
	self._robot.path:setDefaultObstacles(self._robot, true, true)
	self._robot.trajectory:update(ToTarget, self._moveDest, math.pi/2, 0.6)
end

return NavigationPassive
