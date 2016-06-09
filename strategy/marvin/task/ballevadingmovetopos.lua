local BallEvadingMoveToPos = Class("Task.BallEvadingMoveToPos", require "task/base")

local Constants = require "../base/constants"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function BallEvadingMoveToPos:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function BallEvadingMoveToPos:run()
	local minDist = Constants.stopBallDistance + World.Ball.radius + self._robot.radius

	local pos = self._pos
	if pos:distanceTo(World.Ball.pos) < minDist - 0.01 then
		pos = geom.intersectLineCircle(World.Geometry.FriendlyGoal,
			World.Geometry.FriendlyGoal - self._pos, World.Ball.pos, minDist)
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local dir = self._dir or (World.Ball.pos - pos):angle()
	self._robot.trajectory:update(ToTarget, pos, dir)
end

return BallEvadingMoveToPos
