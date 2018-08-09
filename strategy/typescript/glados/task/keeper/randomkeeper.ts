local RandomKeeper = Class("Task.RandomKeeper", require "task/base")

local Field = require "../base/field"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local DEST_SWITCH_DISTANCE = 0.02
local GOAL_DISTANCE = 0.06

function RandomKeeper:_init()
	self._nextX = nil
end

function RandomKeeper:run()
	if not self._nextX or math.abs(self._robot.pos.x - self._nextX) < DEST_SWITCH_DISTANCE then
		local bound = World.Geometry.GoalWidth/2 - self._robot.radius
		self._nextX = math.random() * bound * 2 - bound
	end

	local moveDest = Vector(self._nextX,
			-World.Geometry.FieldHeightHalf + self._robot.radius + GOAL_DISTANCE)

	// ignore goal walls if ball is shot
	local obstacleTable = {
		ignoreBall = true,
		ignoreGoals = false,
		ignoreDefenseArea = true,
		stopBallDistance = 0.05
	}
	if Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		obstacleTable.ignoreFriendlyRobots = true
		obstacleTable.ignoreOpponentRobots = true
	end
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, moveDest, math.pi/2)
end

return RandomKeeper
