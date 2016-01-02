local ChipToBorder = require "task/ability/chiptoborder"
local SaveBall = Class("Task.SaveBall", require "task/base", ChipToBorder)

local World = require "../base/world"
local vis = require "../base/vis"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Field = require "../base/field"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local POSITION_PADDING = 0.02 -- safety distance

function SaveBall:_init()
	self._viewDir = nil -- stabilize direction when we have the ball
	self._endSpeed = nil -- memorize for same reasons as viewDir
end

function SaveBall:run()
	local robotPos = self._robot.pos
	local ballPos = World.Ball.pos
	local ownGoal = World.Geometry.FriendlyGoal
	local moveTime = Robot.minTimeToBall(self._robot)
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

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, ignoreBall, ignoreGoals, false)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	if not self._viewDir or not self._robot:hasBall(World.Ball) then
		local viewDir = ballPos - robotPos
		self._viewDir = viewDir:angle()
		self._endSpeed = viewDir * 0.5
	end
	self._robot.trajectory:update(ToTarget, moveDest, self._viewDir, nil, self._endSpeed)
end

return SaveBall
