local SuggestPass = require "task/ability/suggestpass"
local Dribble = Class("Task.Dribble", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

-- Warning: This task has some very strict precoditions.
-- 1. It will only work if you have the ball in the dribbler at the start
-- 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}):absoluteAngleDiff(viewDir) is pretty small

function Dribble:_init(pos, suggestPass, endSpeedLength)
	self._pos = pos
	self._dir = (pos - self._robot.pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength or 0
end

function Dribble:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self._robot:setDribblerSpeed(0.7)

	local endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
	local _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, 1.0, endSpeed, nil, true)

	if self._suggestPassFlag then
		self:_suggestPass(self._pos, nil, time)
	end
end

return Dribble
