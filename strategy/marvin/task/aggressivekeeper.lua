local ChipToBorder = require "task/ability/chiptoborder"
local AggressiveKeeper = Class("Task.AggressiveKeeper",
	require "task/base", ChipToBorder)

local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local POSITION_PADDING = 0.02 -- safety distance

function AggressiveKeeper:run()
	local safeGoalMid = World.Geometry.FriendlyGoal - Vector(0, 0.05)
	local moveDest
	local ignoreBall
	if World.Ball.pos.y < self._robot.pos.y + POSITION_PADDING then
		-- get between ball and goal
		local ballDist = self._robot.radius + World.Ball.radius
		moveDest = World.Ball.pos + (safeGoalMid - World.Ball.pos):setLength(ballDist) + Vector(0, -POSITION_PADDING)
		ignoreBall = false
	else
		local ballTime = Robot.minTimeToBall(self._robot)
		moveDest = Physics.ballAtTime(World.Ball, ballTime).pos
		moveDest = moveDest + (self._robot.pos - moveDest):setLength(World.Ball.radius)
		ignoreBall = true
	end

	self:_chipToBorderIfSafe()

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, ignoreBall)
	local viewDir = World.Ball.pos - safeGoalMid
	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, viewDir * 0.5)
end

return AggressiveKeeper
