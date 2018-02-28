local SuggestPass = require "task/ability/suggestpass"
local MoveToPos = Class("Task.MoveToPos", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"


function MoveToPos:_init(pos, dir, suggestPass, endSpeedLength, ignoreDefaultObstacles)
	self._pos = pos
	self._dir = dir or (World.Ball.pos - pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength or 0
	local ignore = ignoreDefaultObstacles or false
	self._obstacleTable = {
		ignoreBall = ignore,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = self._inbox,
		ignorePass = ignore,
	}
end

function MoveToPos:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	local endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
	local _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, nil, endSpeed)

	if self._suggestPassFlag then
		self:_suggestPassRobotPosition(self._pos, nil, time)
	end
end

return MoveToPos
