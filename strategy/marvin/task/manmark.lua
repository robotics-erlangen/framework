local ManMark = (require "../base/class").new("Task.ManMark", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field.lua"

ManMark.priority = 3

function ManMark:_init(targetRobot)
	self._targetRobot = targetRobot
end

function ManMark:_run()
	local targetPos = self._targetRobot.pos
	local ballPos = World.Ball.pos

	--preferred position in front of the target robot in direction to the ball
	local midpointDistance = self._targetRobot.radius + self._robot.radius + Settings.markingDistance
	local preferredDir = (ballPos - targetPos):angle()
	local preferredPos = (ballPos - targetPos):setLength(midpointDistance) + targetPos
	preferredPos = Field.limitToAllowedField(preferredPos, self._robot.radius)

	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir)
	
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
end

function ManMark.test()
	local robot = World.FriendlyRobots[1]
	local oppRobot = World.OpponentRobots[1]
	if robot and oppRobot then
		return ManMark.create(robot, oppRobot)
	end
end

return ManMark
