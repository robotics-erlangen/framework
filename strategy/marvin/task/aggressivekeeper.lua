local ChipToBorder = require "task/ability/chiptoborder"
local AggressiveKeeper = Class("Task.AggressiveKeeper",
	require "task/base", ChipToBorder)

local World = require "../base/world"
local Ball = require "observer/ball"
local ToTarget = require "trajectory/totarget"

function AggressiveKeeper:run()
	local tpos, ttime = Ball.toBall(self._robot, World.Ball)
	local fromGoal = (tpos - World.Geometry.FriendlyGoal):angle()

	self:_chipToBorderIfSafe()

	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.trajectory:update(ToTarget, tpos, fromGoal, nil, Vector.fromAngle(fromGoal))

	self._send.aggressiveKeeperPos("all", tpos)
end

return AggressiveKeeper
