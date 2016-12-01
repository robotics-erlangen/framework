local SuggestPass = require "task/ability/suggestpass"
local Striker = Class("Task.Striker", require "task/base", SuggestPass)

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function Striker:_init()
	self._moveDest = nil
end

function Striker:run()
	local groupApplication = { name = "striker", payload = 0 }
	self._send.groupApplication("trainer", groupApplication)

	local zone = self._inbox.strikerZone().trainer
	if zone then
		self._moveDest = zone.defaultPos
	end

	self:_suggestPass(self._moveDest)

	if self._moveDest then
		PathHelper.setDefaultObstacles(self._robot.path, self._robot)
		PathHelper.addRobotObstacles(self._robot.path, self._robot)
		self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
	end
end

return Striker