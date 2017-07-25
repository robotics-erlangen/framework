local SuggestPass = require "task/ability/suggestpass"
local SideStep = Class("Task.SideStep", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"

function SideStep:_init(pass)
	self._passInfo = passInfo
end

function SideStep:run()
	local groupApplication = { name = "striker", payload = {}}
	self._send.groupApplication("trainer", groupApplication)

	local _, attackPosition = next(self._inbox.attackPosition())
	if attackPosition then
		self:_suggestPass(self._passInfo.ballPos, attackPosition, self._passInfo.time)
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local dir = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	self._robot.trajectory:update(ToTarget, Vector(0, 0), dir)
end

return SideStep
