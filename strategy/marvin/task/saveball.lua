local ChipToBorder = require "task/ability/chiptoborder"
local SaveBall = (require "../base/class").newTask("Task.SaveBall", require "task/base", ChipToBorder)

local World = require "../base/world"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local Field = require "../base/field"
local ToTarget = require "trajectory/totarget"

function SaveBall:run()
	local robotPos = self._robot.pos
	local ballPos = World.Ball.pos
	local ownGoal = World.Geometry.FriendlyGoal
	local moveDest = Ball.toBall(self._robot, World.Ball)
	moveDest = moveDest + (robotPos - moveDest):setLength(World.Ball.radius)
	if ballPos:distanceTo(ownGoal) < robotPos:distanceTo(ownGoal) then
		-- get between ball and goal
		local ballDist = self._robot.radius + Settings.positionPadding
		moveDest = ballPos + (ownGoal - ballPos):setLength(ballDist)
		moveDest = Field.limitToAllowedField(moveDest, self._robot.radius, true)
	end

	if self._robot.pos.y < -1.2 then -- we cannot chip precisely enough at the moment
			self:_chipToBorderIfSafe()
	end

	self._robot.path:setDefaultObstacles(self._robot, true, false, false, self._robot.shootRadius)
	self._robot.path:addRobotObstacles(self._robot)

	local viewDir = ballPos - robotPos
	local endSpeed = viewDir * 0.5
	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, endSpeed)
end

return SaveBall
