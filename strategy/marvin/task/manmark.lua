local ManMark = (require "base/class").new("Task.ManMark", require "task/base")

local World = require "base/world"
local ToTarget = require "trajectory/totarget"

Base._priority = 3

function Base:_init(targetRobot)
	self._targetRobot = targetRobot
end

function Base:_run()
	local targetPos = self._targetRobot.pos
	local ballPos = World.Ball.pos
	
	--calculate position in front of the target robot
	local midpointDistance = self._targetRobot.radius + self._robot.radius + Settings.markingDistance
	local preferredDir = (ballPos - targetPos):angle()
	local preferredPos = (ballPos - targetPos):setLength(midpointDistance) + targetPos
	
	--TODO test position
	
	
	self._robot.trajectory:update(ToTarget, parameter)
	
end

return ManMark
