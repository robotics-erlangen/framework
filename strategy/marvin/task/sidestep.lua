local SuggestPass = require "task/ability/suggestpass"
local SideStep = Class("Task.SideStep", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"

function SideStep:_init()
end

function SideStep:run()
	local groupApplication = { name = "striker", payload = {}}
	self._send.groupApplication("trainer", groupApplication)

	local _, passInfoTable = next(self._inbox.passInfo())
	local passInfo = nil
	for _, pass in ipairs(passInfoTable) do
		if pass.target == self._robot then
			passInfo = pass
			break
		end
	end

	local _, attackPosition = next(self._inbox.attackPosition())
	if attackPosition then
		self:_suggestPass(passInfo.ballPos, attackPosition, passInfo.time)
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local dir = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	self._robot.trajectory:update(ToTarget, Vector(0, 0), dir)
end

return SideStep
