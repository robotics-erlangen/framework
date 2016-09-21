local ForceShoot = require "task/ability/forceshoot"
local AggressiveKeeper = Class("Task.AggressiveKeeper",
	require "task/base", ForceShoot)

local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local POSITION_PADDING = 0.02 -- safety distance

local CHIP_IMPACT_DIST_FROM_BORDER = 0.5
local CHIP_DIST_FACTOR = 0.25
local CHIP_GOAL_LINE_DIST = 1

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


local touchLineDir = Vector(0, 1)

local leftFriendlyCorner = Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local rightFriendlyCorner = Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)

-- assume chips crossing this line might cross the goal line
local leftNearBasePoint = Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
local rightNearBasePoint = Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
local nearBaseLineDir = rightNearBasePoint-leftNearBasePoint

function AggressiveKeeper:_chipToBorderIfSafe()
	local robotPos = self._robot.pos
	local ballPos = World.Ball.pos
	local robotDir = ballPos - robotPos
	local viewAngle = robotDir:angle()
	local rigthCornerAngle = (rightFriendlyCorner - robotPos):angle()
	local leftCornerAngle = (leftFriendlyCorner - robotPos):angle()
	if viewAngle > rigthCornerAngle or viewAngle < leftCornerAngle then -- not towards own goal line
		local touchLineIntersection = Field.nextLineCut(robotPos, robotDir)
		local chipPos = geom.intersectLineLine(robotPos, robotDir, leftNearBasePoint, nearBaseLineDir)

		if chipPos and touchLineIntersection then
			if robotPos:distanceTo(touchLineIntersection) < robotPos:distanceTo(chipPos) then
				chipPos = touchLineIntersection
			end
		elseif touchLineIntersection then -- no nearBaseline
			chipPos = touchLineIntersection
		else -- probably because ball is out of field
			chipPos = World.Geometry.OpponentGoal
		end
		local chipDist = World.Ball.pos:distanceTo(chipPos) - CHIP_IMPACT_DIST_FROM_BORDER
		if chipPos ~= touchLineIntersection then -- try to avoid icing if chipping towards the opponent goal line
			chipDist = chipDist*CHIP_DIST_FACTOR
		end

		vis.addCircle("t/a/chipToBorder", ballPos + robotDir:copy():setLength(chipDist), 0.1, vis.colors.blue, true)
		if not Robot.hadBall(self._robot, 0) then
			self._forceShootTimer = nil
		end
		self:_doForceShoot()
		self._robot:chip(chipDist)
	end
end

return AggressiveKeeper
