local ChipToBorder = require "task/ability/chiptoborder"
local AggressiveKeeper = Class("Task.AggressiveKeeper",
	require "task/base", ChipToBorder)

local World = require "../base/world"
local Physics = require "observer/physics"
local ToTarget = require "trajectory/totarget"

function AggressiveKeeper:run()
	local ballTime = Physics.robotMinTimeToBall(self._robot, World.Ball)
	local ballPos = Physics.ballAtTime(World.Ball, ballTime).pos
	local fromGoal = (ballPos - World.Geometry.FriendlyGoal):angle()

	self:_chipToBorderIfSafe()

	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.trajectory:update(ToTarget, ballPos, fromGoal, nil, Vector.fromAngle(fromGoal))

	self._send.aggressiveKeeperPos("all", ballPos)
end

return AggressiveKeeper
