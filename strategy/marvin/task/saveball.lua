local ChipToBorder = require "task/ability/chiptoborder"
local SaveBall = Class("Task.SaveBall", require "task/base", ChipToBorder)

local World = require "../base/world"
local vis = require "../base/vis"
local Physics = require "observer/physics"
local Field = require "../base/field"
local ToTarget = require "trajectory/totarget"

local POSITION_PADDING = 0.02 -- safety distance

function SaveBall:run()
	local robotPos = self._robot.pos
	local ballPos = World.Ball.pos
	local ownGoal = World.Geometry.FriendlyGoal
	local moveTime = Physics.robotMinTimeToBall(self._robot, World.Ball)
	local moveDest = Physics.ballAtTime(World.Ball, moveTime).pos
	moveDest = moveDest + (robotPos - moveDest):setLength(World.Ball.radius)
	if ballPos.y < robotPos.y then
		-- get between ball and goal
		local ballDist = self._robot.radius + POSITION_PADDING
		moveDest = ballPos + (ownGoal - ballPos):setLength(ballDist)
	end

	if self._robot.pos.y < -1.2 then -- we cannot chip precisely enough at the moment
			self:_chipToBorderIfSafe()
	end
	local ignoreBall = true
	local ignoreGoals = false
	if self._robot == World.FriendlyKeeper and World.Ball.pos.y < -World.Geometry.FieldHeightHalf + 0.2 then
		ignoreBall = false
		ignoreGoals = true
	end

	self._robot.path:setDefaultObstacles(self._robot, ignoreBall, ignoreGoals, false)
	self._robot.path:addRobotObstacles(self._robot)

	local viewDir = ballPos - robotPos
	local endSpeed = viewDir * 0.5
	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, endSpeed)
end

return SaveBall
