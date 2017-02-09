local SuggestPass = require "task/ability/suggestpass"
local MoveToPos = Class("Task.MoveToPos", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"


function MoveToPos:_init(pos, dir, suggestPass)
	self._pos = pos
	self._dir = dir or (World.Ball.pos - pos):angle()
	self._suggestPassFlag = suggestPass
end

function MoveToPos:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir)

	if self._suggestPassFlag then
		self:_suggestPass(self._pos, nil, time)
	end
end

return MoveToPos
