local ForceShoot = require "task/ability/forceshoot"
local AggressiveKeeperTest = Class("Task.AggressiveKeeperTest",
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


local POSITION_PADDING = 0.02 -- safety distance

local CHIP_IMPACT_DIST_FROM_BORDER = 0.5
local CHIP_DIST_FACTOR = 0.25
local CHIP_GOAL_LINE_DIST = 1

function AggressiveKeeperTest:run()
	local safeGoalMid = World.Geometry.FriendlyGoal - Vector(0, 0.05)
	local moveDest
	local ignoreBall
	local ballSpeed = World.Ball.speed
	local robotPos = self._robot.pos
	local viewDir = World.Ball.pos - safeGoalMid
	local endspeed = Vector(0,0)
	local ballTime = math.min(Robot.minTimeToBall(self._robot), 1)
	if World.Ball.pos.y < robotPos.y + POSITION_PADDING then
		-- get between ball and goal
		local ballDist = self._robot.radius + World.Ball.radius
		moveDest = World.Ball.pos + (safeGoalMid - World.Ball.pos):setLength(ballDist) + Vector(0, -POSITION_PADDING)
		ignoreBall = false
	else
		moveDest = Physics.ballAtTime(World.Ball, ballTime).pos
		moveDest = moveDest + (robotPos - moveDest):setLength(World.Ball.radius)
		ignoreBall = true
	end
	if ballSpeed.y < 0 then
		local pos, dir, isShot = Goal.predictShot()
		if pos then
			local x = geom.intersectLineLine(World.Geometry.FriendlyGoal, Vector(1,0), pos, dir).x
			local dyky = math.max(math.abs(x)*2 / World.Geometry.GoalWidth/2, 1)
			-- if math.abs(x) < World.Geometry.GoalWidth/2 then
				-- local alpha = 1/(1+self._robot.pos:distanceTo(pos)/2)
				local alpha = (1-(math.exp(-ballSpeed:length()/2)))/(1+self._robot.pos:distanceTo(pos)/2)
				alpha = alpha / dyky
				-- log(isShot)
				local interceptPos = robotPos:orthogonalProjection(pos, pos+dir)
				if interceptPos then
					vis.addCircle("t/a/ballintercept", interceptPos, 0.04, vis.colors.gold, true)
					vis.addCircle("t/a/ballintercept", moveDest, 0.04, vis.colors.gold, true)
					log(alpha)
					log(isShot)
					log(ballTime)
					if ballSpeed.y < -2 and ballTime == 1 then
						endspeed = (interceptPos-robotPos):setLength(2)+self._robot.speed
						moveDest = robotPos + (self._robot.speed + endspeed) * ballTime / 2
					else
						moveDest = moveDest*(1-alpha) + interceptPos * alpha
					end
				end
			-- end
		end
	else
		endspeed = viewDir * 0.5
	end

	self:_chipToBorderIfSafe()

	local obstacleTable = {
		["ignoreBall"] = ignoreBall,
		ignorePass = true
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, moveDest, viewDir:angle(), nil, endspeed)
end


local leftFriendlyCorner = Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local rightFriendlyCorner = Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)

-- assume chips crossing this line might cross the goal line
local leftNearBasePoint = Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
local rightNearBasePoint = Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-CHIP_GOAL_LINE_DIST)
local nearBaseLineDir = rightNearBasePoint-leftNearBasePoint

function AggressiveKeeperTest:_chipToBorderIfSafe()
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

return AggressiveKeeperTest
