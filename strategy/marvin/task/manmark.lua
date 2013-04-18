local ManMark = (require "../base/class").new("Task.ManMark", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"

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
	
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir)
end

function ManMark.factory(position, opponent)
	local f = function (robots)
		return ManMark.create(robots[position], opponent)
	end
	return f
end

function ManMark.test(id)
	if id > 2 then
		return nil
	end
	local opp = World.OpponentRobots[id + 1]
	if opp then
		return ManMark.factory(1, opp), 1
	else
		return nil
	end
end

return ManMark
