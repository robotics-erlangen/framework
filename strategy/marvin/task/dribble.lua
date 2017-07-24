local SuggestPass = require "task/ability/suggestpass"
local Dribble = Class("Task.Dribble", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function Dribble:_init(pos, dir, suggestPass, endSpeedLength)
	self._pos = pos
	log(pos)
	self._dir = dir or (-(self._robot.pos - pos)):angle()
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
