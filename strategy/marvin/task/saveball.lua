local SaveBall = (require "../base/class").newTask("Task.SaveBall", require "task/base")

local World = require "../base/world"
local Ball = require "observer/ball"
local Field = require "util/field"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"

function SaveBall:run()
	local ballPos = World.Ball.pos
	local ownGoal = World.Geometry.FriendlyGoal
	local moveDest = Ball.toBall(self._robot, World.Ball)
	if ballPos:distanceTo(ownGoal) < self._robot.pos:distanceTo(ownGoal) then
		-- get between ball and goal
		local ballDist = self._robot.radius + Settings.positionPadding
		moveDest = ballPos + (ownGoal - ballPos):setLength(ballDist)
		moveDest = Field.limitToAllowedField(moveDest, self._robot.radius, true)
	end

	local viewDir = (World.Ball.pos - self._robot.pos):angle()
	if viewDir > 0 and viewDir < math.pi then
		self._robot:setDribblerSpeed(1)
		self._robot:chip(1)
	end

	self._robot.path:setDefaultObstacles(self._robot, false, false, false, self._robot.shootRadius)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, moveDest, viewDir)
end

return SaveBall
