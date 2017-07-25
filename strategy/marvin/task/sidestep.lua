local SuggestPass = require "task/ability/suggestpass"
local SideStep = Class("Task.SideStep", require "task/base")

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"

function SideStep:_init()
end

function SideStep:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local dir = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	self._robot.trajectory:update(ToTarget, Vector(0, 0), dir)
end

return SideStep
