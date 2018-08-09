local ForceShoot = require "task/ability/forceshoot"
local ShootoutKeeper = Class("Task.Keeper.ShootoutKeeper",
	require "task/base", ForceShoot)

local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"

local G = World.Geometry

local POSITION_PADDING = 0.02 // safety distance

local CHIP_IMPACT_DIST_FROM_BORDER = 0.5
local CHIP_DIST_FACTOR = 0.25
local CHIP_GOAL_LINE_DIST = 1

local SAFE_GOAL_MID = G.FriendlyGoal - Vector(0, 0.05)

local OBSTACLE_TABLE = {
	ignorePass = true
}

function ShootoutKeeper:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, OBSTACLE_TABLE)

	local moveDest
	local endspeed = Vector(0,0)
	local ballSpeed = World.Ball.speed
	local viewDir = World.Ball.pos - SAFE_GOAL_MID

	local ballTime = math.min(Robot.minTimeToBall(self._robot), 1)

	local ballCloserToGoal = World.Ball.pos.y < self._robot.pos.y + POSITION_PADDING
	PathHelper.setObstacleParam(self._robot, "ignoreBall", not ballCloserToGoal)
	if ballCloserToGoal then
		// get between ball and goal
		local ballDist = self._robot.radius + World.Ball.radius
		moveDest = World.Ball.pos + (SAFE_GOAL_MID - World.Ball.pos):setLength(ballDist) + Vector(0, -POSITION_PADDING)
	else
		moveDest = Physics.ballAtTime(World.Ball, ballTime).pos
		moveDest = moveDest + (self._robot.pos - moveDest):setLength(World.Ball.radius + self._robot.radius)
	end

	if ballSpeed.y < 0 then
		local pos, dir = Goal.predictShot()

		// The x coordinate where the predicted ball will cross the goal line
		local predictedGoallinePoint = geom.intersectLineLine(G.FriendlyGoal, Vector(1, 0), pos, dir).x
		// The distance of the predicted point as a percentage of the half goal width, is 1 if the point is inside the goal
		local centerDistancePerc = math.max(2 * math.abs(predictedGoallinePoint) / G.GoalWidth, 1)

		// Used to determine a spot between predicted shot position and the catch position near the ball
		local alpha = ( 1 - math.exp(-ballSpeed:length() / 2) ) / ( 1 + self._robot.pos:distanceTo(pos) / 2 )
		// It is unlikely that the opponent doesn't want to shoot the ball at our goal
		alpha = alpha / centerDistancePerc

		local interceptPos = self._robot.pos:orthogonalProjection(pos, pos+dir)

		vis.addCircle("t/k/shootoutkeeper: intercept", interceptPos, World.Ball.radius, vis.colors.gold, true)
		vis.addCircle("t/k/shootoutkeeper: intercept", moveDest, World.Ball.radius, vis.colors.gold, true)

		// If the ball was shot and we probably wont reach it in time, we go rambo
		if ballSpeed.y < -2 and ballTime == 1 then
			endspeed = (interceptPos - self._robot.pos):setLength(2) + self._robot.speed
			moveDest = self._robot.pos + (self._robot.speed + endspeed) * ballTime / 2
		else
			moveDest = moveDest * (1 - alpha) + interceptPos * alpha
		end
	else
		endspeed = viewDir * 0.5
	end

	self:_chipToBorderIfSafe()

	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, endspeed)
end


local leftFriendlyCorner = Vector(-G.FieldWidthHalf, -G.FieldHeightHalf)
local rightFriendlyCorner = Vector(G.FieldWidthHalf, -G.FieldHeightHalf)

// assume chips crossing this line might cross the goal line
local leftNearBasePoint = Vector(-G.FieldWidthHalf, G.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
local rightNearBasePoint = Vector(G.FieldWidthHalf, G.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
local nearBaseLineDir = rightNearBasePoint-leftNearBasePoint

function ShootoutKeeper:_chipToBorderIfSafe()
	local robotPos = self._robot.pos
	local ballPos = World.Ball.pos
	local robotDir = ballPos - robotPos
	local viewAngle = robotDir:angle()
	local rigthCornerAngle = (rightFriendlyCorner - robotPos):angle()
	local leftCornerAngle = (leftFriendlyCorner - robotPos):angle()
	if viewAngle > rigthCornerAngle or viewAngle < leftCornerAngle then // not towards own goal line
		local touchLineIntersection = Field.nextLineCut(robotPos, robotDir)
		local chipPos = geom.intersectLineLine(robotPos, robotDir, leftNearBasePoint, nearBaseLineDir)

		if chipPos and touchLineIntersection then
			if robotPos:distanceTo(touchLineIntersection) < robotPos:distanceTo(chipPos) then
				chipPos = touchLineIntersection
			end
		elseif touchLineIntersection then // no nearBaseline
			chipPos = touchLineIntersection
		else // probably because ball is out of field
			chipPos = G.OpponentGoal
		end
		local chipDist = World.Ball.pos:distanceTo(chipPos) - CHIP_IMPACT_DIST_FROM_BORDER
		if chipPos ~= touchLineIntersection then // try to avoid icing if chipping towards the opponent goal line
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

return ShootoutKeeper
