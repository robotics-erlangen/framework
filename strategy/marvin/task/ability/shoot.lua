local CatchBall = require "task/ability/catchball"
local ForceShoot = require "task/ability/forceshoot"
local Shoot = {}
-- note: CatchBall depends on Volley
Shoot.depends = { CatchBall, ForceShoot }

local debug = require "../base/debug"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"
local TrajectoryDirect = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Rating = require "util/rating"


-- if the ball speed is lower than RESTING_BALL_SPEED
-- the ball is resting or at least very slow
local RESTING_BALL_SPEED = 0.2
local RESTING_BALL_SPEED_HYST = 0.1

-- if the ball speed is lower than WOBBLING_BALL_SPEED
-- the ball is probably resting
local WOBBLING_BALL_SPEED = 0.8
local WOBBLING_BALL_SPEED_HYST = 0.3

-- if the ball movement direction and the shoot direction differ less than CHASE_BALL_ANGLE
-- we chase the ball instead of stopping it
local CHASE_BALL_ANGLE = 70 * math.pi / 180
local CHASE_BALL_ANGLE_HYST = 5 * math.pi / 180
local CHASE_BALL_SIDE_SPEED = 1.25
local CHASE_BALL_SIDE_SPEED_HYST = 0.25

-- if inverse ball movement direction and the shoot direction differ less than VOLLEY_ANGLE
-- we can shoot the ball as soon as it touches the dribbler instead of stopping it
local VOLLEY_ANGLE = 70 * math.pi / 180
local VOLLEY_ANGLE_HYST = 5 * math.pi / 180

-- direct movement
local EXTRA_MOVE_SPEED_LIMIT = 0.5
local SIDEWARDS_KP = 9
local SIDEWARDS_KI = 2.4
local SIDEWARDS_SPEED_LIMIT = 0.5

-- chip distance scaling factor for passes
local CHIP_PASS_DISTANCE_FACTOR = 0.4

-- if the robot view direction and the shoot direction differ less than MIN_PRECISION
-- the robot is allowed to shoot the ball
local MIN_PRECISION = 3.5 * math.pi / 180
local MIN_PRECISION_CHASE = 6 * math.pi / 180


function Shoot:init()
	-- possible values = { StationaryBall, ChaseBall, Volley, StopBall }
	self._state = nil

	-- direct movement
	self._directExtraSpeed = 0
	self._sideOffsetErrorSum = 0

	self._lastTargetPos = nil
	self._linearShoot = true

	self._precision = 0
	self._rightOrientation = false

	self._lastBallInsideRobotTime = 0
	self._directMovement = false
	self._catchBallActive = false
end

function Shoot:_setObstacles(moveDest)
    local ignoreRobots = self._robot.speed:length() < 1
    PathHelper.setObstacleParam(self._robot, "ignoreBall", true)
    PathHelper.setObstacleParam(self._robot, "ignorePass", true)
    PathHelper.setObstacleParam(self._robot, "ignoreFriendlyRobots", ignoreRobots)
    PathHelper.setObstacleParam(self._robot, "ignoreOpponentRobots", ignoreRobots)

	if moveDest then
		local distToBall = moveDest:distanceTo(World.Ball.pos)
		local obstacleSize = Rating.valueToRating(distToBall, 0.2, 0.4) * (World.Ball.radius + 0.01)
		if obstacleSize > 0 then
			-- This obstacle should have the same priority as the ball obstacle in pathhelper
			self._robot.path:addCircle(World.Ball.pos.x, World.Ball.pos.y, obstacleSize, "t/a/shoot ball", 84)
		end
	end
end

function Shoot:_calculateFutureBall(ballReceiptPos)
	local futureBallPos

	if World.Ball.speed:length() > 0.1 then
		if ballReceiptPos and (ballReceiptPos - World.Ball.pos):dot(World.Ball.speed) > 0 then
			futureBallPos = ballReceiptPos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		else
			local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(
				self._robot.shootRadius + World.Ball.radius)
			futureBallPos = dribblerPos:nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
		end
	else
		futureBallPos = World.Ball.pos
	end

	local ballTime = math.max(0, Physics.checkedBallTravelTime(World.Ball, futureBallPos))
	local futureBall = Physics.ballAtTime(World.Ball, ballTime)

	-- if futureBall.pos:distanceTo(self._robot.pos) < self._robot.shootRadius + World.Ball.radius then
	-- end

	if World.Ball.pos:distanceTo(self._robot.pos) < self._robot.shootRadius + World.Ball.radius then
		futureBall.pos = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.shootRadius + World.Ball.radius)
		self._lastBallInsideRobotTime = World.Time
	end

	if ballReceiptPos then
		vis.addCircle("t/a/shoot: ballReceiptPos", ballReceiptPos, 0.04, vis.colors.magentaHalf, true)
	end
	vis.addCircle("t/a/shoot: futureBall", futureBall.pos, futureBall.radius, vis.colors.orangeHalf, true)

	return futureBall, math.max(0, ballTime)
end

function Shoot:_catchBallNecessary(moveDest, futureBallTime)
	if Robot.hadBall(self._robot, 0) then
		return false
	end

	local robotTime = Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0))	
	if robotTime < futureBallTime + 0.1 then
		return false
	end

	if not self._catchBallActive and robotTime < 0.7 and World.Ball.speed:lengthSq() > 0.3
			and World.Ball.speed:dot(self._robot.pos - World.Ball.pos) > 0 then
		return false
	end

	return true
end

function Shoot:_getState(targetPos, futureBall, futureBallTime, targetTime, chaseFutureBall)
	-- check if the ball can be chased
	local restingBallSpeed = RESTING_BALL_SPEED + (self._state == "ChaseBall" and -1 or 1) * RESTING_BALL_SPEED_HYST
	local shootVector = targetPos - chaseFutureBall.pos
	local angleDiff = chaseFutureBall.speed:absoluteAngleDiff(shootVector)
	local relativeBallPos = World.Ball.pos - self._robot.pos
	local sidewardsVector = shootVector:perpendicular():normalize()
	local sidewardsBallSpeed = World.Ball.speed:dot(sidewardsVector)
	local chaseBallAngle = CHASE_BALL_ANGLE + (self._state == "ChaseBall" and 1 or -1) * CHASE_BALL_ANGLE_HYST
	local sidewardsSpeedLimit = CHASE_BALL_SIDE_SPEED + (self._state == "ChaseBall" and 1 or -1) * CHASE_BALL_SIDE_SPEED_HYST
	if chaseFutureBall.speed:length() > restingBallSpeed
			and angleDiff < chaseBallAngle and (World.Ball.speed:dot(relativeBallPos) > 0 or World.Ball.posZ > 0)
			and World.Ball.speed:dot(chaseFutureBall.pos - self._robot.pos) > 0
			and sidewardsBallSpeed < sidewardsSpeedLimit then
		return "ChaseBall"
	end

	-- check if the ball is stationary
	local wobblingBallSpeed = WOBBLING_BALL_SPEED + (self._state == "StationaryBall" and 1 or -1) * WOBBLING_BALL_SPEED_HYST
	if not Ball.wasShot(0.5) and futureBall.speed:length() < wobblingBallSpeed then
		return "StationaryBall"
	end

	-- if the targetPos changed significantly, reset to stopBall
	if self._lastTargetPos and targetPos:distanceTo(self._lastTargetPos) > 0.05 and futureBallTime > 0.35 then
		self._state = "StopBall"
	end

	-- don't redecide if the ball is very close
	if self._state ~= nil and futureBallTime < 0.3 then
		return self._state
	end

	-- check if the ball can be shot volley
	local volleyAngle = VOLLEY_ANGLE + (self._state == "Volley" and 1 or -1) * VOLLEY_ANGLE_HYST
	if math.pi - angleDiff < volleyAngle then
		local passTravelTime = ObserverShoot.ballPassTime(futureBall.pos, targetPos, nil, nil, self._robot)
		local bufferTime = self._state == "Volley" and 0.3 or 0
		if not targetTime or World.Time + futureBallTime + passTravelTime + bufferTime > targetTime then
			return "Volley"
		end
	end

	-- otherwise stop the ball
	return "StopBall"
end

function Shoot:_correctSidewardsOffset()
	local distToBall = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
	distToBall.x = distToBall.x - self._robot.shootRadius - World.Ball.radius - 0.01

	local p_out = SIDEWARDS_KP * -distToBall.y
	local errorMax = math.bound(0, SIDEWARDS_SPEED_LIMIT - p_out, SIDEWARDS_SPEED_LIMIT)
	local errorMin = math.bound(-SIDEWARDS_SPEED_LIMIT, -SIDEWARDS_SPEED_LIMIT - p_out, 0)
	self._sideOffsetErrorSum = math.bound(errorMin, self._sideOffsetErrorSum + SIDEWARDS_KI * p_out * World.TimeDiff, errorMax)
	debug.set("Shoot/sideIntegral", self._sideOffsetErrorSum)

	-- correct sidewards pos error
	return Vector.fromAngle(self._robot.dir):perpendicular():setLength(
			math.bound(-SIDEWARDS_SPEED_LIMIT, p_out + self._sideOffsetErrorSum, SIDEWARDS_SPEED_LIMIT))
end

function Shoot:_sendShootCommand(kickSpeed, targetPos, targetDir)
	local angleDiff = math.abs(geom.normalizeAngle(self._robot.dir - targetDir))
	debug.set("Shoot/angleDiff (degrees)", angleDiff * 180 / math.pi)

	local threshhold = self._precision * (self._rightOrientation and 1.2 or 0.8)
	self._rightOrientation = angleDiff < threshhold
	debug.set("Shoot/rightOrientation", self._rightOrientation)

	if self._rightOrientation then
		debug.set("Shoot/shootCommand", self._linearShoot and "linear" or "chip")
		if self._linearShoot then
			self._robot:shoot(kickSpeed, true)
		else
			local dist = World.Ball.pos:distanceTo(targetPos)
			self._robot:chip(dist)
		end
	end
end

function Shoot:_shootStationaryBall(targetPos, targetSpeed, targetTime, futureBall)
	local shootDir = (targetPos - self._robot.pos):angle()

	local maxSidewardsAngle
	local maxOrientationAngle
	local minCatchBallDistance
	local hasBallDistance
	local speedupFactor

	if Referee.isFriendlyFreeKickState() or World.RefereeState == "BallPlacementOffensive" then
		maxSidewardsAngle = 30 * math.pi / 180
		maxOrientationAngle = 2 * math.pi / 180
		minCatchBallDistance = 0.01
		hasBallDistance = 0.04
		speedupFactor = 0.4
	else
		maxSidewardsAngle = 30 * math.pi / 180
		maxOrientationAngle = 8 * math.pi / 180
		minCatchBallDistance = 0.00
		hasBallDistance = 0.1
		speedupFactor = 0.8
	end

	-- hysteresis to cope with mediocre vision
	if self._directMovement then
		maxSidewardsAngle = maxSidewardsAngle * 1.5
		maxOrientationAngle = maxOrientationAngle * 1.5
		hasBallDistance = hasBallDistance * 1.5
	end

	local hasBallSideOffset = self._directMovement and 0.02 or 0
	self._directMovement = self._robot:hasBall(World.Ball, hasBallSideOffset, hasBallDistance)
		and math.abs(geom.normalizeAngle((World.Ball.pos - self._robot.pos):angle() - shootDir)) < maxSidewardsAngle
		and math.abs(geom.normalizeAngle(self._robot.dir - shootDir)) < maxOrientationAngle

	debug.set("Shoot/AngleError", geom.normalizeAngle(math.abs(self._robot.dir - shootDir)) * 180 / math.pi)

	local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)
	if targetTime then
		local kickSpeedVector = (targetPos - futureBall.pos):setLength(kickSpeed)
		local shootBall = { maxSpeed = kickSpeed, speed = kickSpeedVector }
		local ballTime = Physics.ballRollTime(shootBall, futureBall.pos:distanceTo(targetPos))
		if World.Time + 0.2 + ballTime < targetTime then
			self._directMovement = false
		end
	end

	if self._directMovement then
		local accelerate = self._robot.acceleration.aSpeedupFMax * speedupFactor
		self._directExtraSpeed = math.min(self._directExtraSpeed + accelerate * World.TimeDiff, EXTRA_MOVE_SPEED_LIMIT)
		local accel = Vector.fromAngle(targetDir) * accelerate
		local speed = Vector.fromAngle(targetDir) * self._directExtraSpeed

		speed = speed + self:_correctSidewardsOffset()

		debug.set("Shoot/directSpeed", speed)
		debug.set("Shoot/directDir", targetDir)
		debug.set("Shoot/directAccel", accel)
		self:_setObstacles(nil)
		self._robot.trajectory:update(TrajectoryDirect, speed, targetDir, nil, accel)
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", targetTime or World.Time)
		self._catchBallActive = false
	else
		local attackTime = self:_catchBall(targetPos, minCatchBallDistance, targetSpeed)
		self._send.attackTime("all", targetTime or attackTime + World.Time)
		self._catchBallActive = true
	end

	debug.set("Shoot/DirectMovement", self._directMovement)
end

function Shoot:_calculateChaseFutureBall(targetPos)
	local dribblerOffset = (targetPos - World.Ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	local moveDest = World.Ball.pos - dribblerOffset
	local moveTime = moveDest:distanceTo(self._robot.pos) / math.min(self._robot.speed:length(), 1)
	local futureBall =  Physics.ballAtTime(World.Ball, moveTime)
	vis.addCircle("t/a/shoot chase future ball", futureBall.pos, 0.03, vis.colors.orange)
	return futureBall
end

function Shoot:_shootChaseBall(targetPos, targetSpeed, futureBall)
	local relativeEndSpeed = 1

	self._precision = MIN_PRECISION_CHASE

	local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)

	local dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	local moveDest = futureBall.pos - dribblerOffset
	local endSpeed = futureBall.speed:copy():setLength(futureBall.speed:length() + relativeEndSpeed)

	endSpeed = self:limitEndSpeedToField(moveDest, endSpeed)

	self:_setObstacles(moveDest)
	self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, endSpeed)
	self._send.attackPosition("all", futureBall.pos)
	self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, endSpeed) + World.Time)

	local currentDribblerPos = self._robot.pos + dribblerOffset
	if World.Ball.pos:distanceTo(currentDribblerPos) < 0.35 then
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
	end
end

local MIN_TIME = 0.2
local DISTRACTION_PERCENTAGE = 0.9
function Shoot:_shootVolley(targetPos, targetSpeed, futureBall, futureBallTime)
	local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)
	local dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	local moveDest = futureBall.pos - dribblerOffset

	-- don't follow the ball if it is inside the robot (because of the ball extrapolation)
	if World.Time - self._lastBallInsideRobotTime < 0.1 then
		moveDest = self._robot.pos
	end
	debug.set("ballinsiderobot", World.Time - self._lastBallInsideRobotTime)

	-- don't look in the correct direction from the beginning
	local ball = table.copy(World.Ball)
	local distance = ball.pos:distanceTo(futureBall.pos)
	local ballTravelTime = Physics.ballTravelTime(ball, distance)
	if self._robot.pos:distanceTo(moveDest) < 0.05 and ballTravelTime > MIN_TIME then
		local clockwiseRotation, counterClockwiseRotation = Physics.robotRotationRangeForTime(self._robot,
				DISTRACTION_PERCENTAGE * ballTravelTime)
		local shootVector = targetPos - moveDest
		local shootAngle = shootVector:angle()
		local angleDiff = math.abs(self._robot.dir - shootAngle)

		local rotateClockwise = moveDest.x > 0
		if rotateClockwise and counterClockwiseRotation > angleDiff then
			shootVector:rotate(-clockwiseRotation)
		elseif not rotateClockwise and clockwiseRotation > angleDiff then
			shootVector:rotate(counterClockwiseRotation)
		end
		targetPos = moveDest + shootVector
	end

	if not self:_catchBallNecessary(moveDest, futureBallTime) then
		self:_setObstacles(moveDest)
		self._robot.trajectory:update(ToTarget, moveDest, targetDir)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", futureBallTime + World.Time)
		self._catchBallActive = false
	else
		self:_catchBall(targetPos, 0, targetSpeed)
		self._send.attackTime("all", futureBallTime + World.Time)
		self._catchBallActive = true
	end

	local currentDribblerPos = self._robot.pos + dribblerOffset
	if World.Ball.pos:distanceTo(currentDribblerPos) < 0.35 then
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
	end
end

function Shoot:_shootStopBall(futureBall, futureBallTime)
	local ballOrigin = futureBall.pos - futureBall.speed
	local targetDir = (-futureBall.speed):angle()
	local dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	local moveDest = futureBall.pos - dribblerOffset

	if not self:_catchBallNecessary(moveDest, futureBallTime) then
		self:_setObstacles(moveDest)
		self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, nil)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0)) + World.Time)
		self._catchBallActive = false
	else
		local attackTime = self:_catchBall(ballOrigin, 0, nil)
		self._send.attackTime("all", attackTime + World.Time)
		self._catchBallActive = true
	end

	-- activate dribbler to stop the ball
	if futureBallTime < 0.3 then
		self._robot:setDribblerSpeed(0.6)
	end

	self._rightOrientation = false
end

function Shoot._visualizeShoot(futureBall, targetPos, color)
	vis.addCircle("t/a/shoot: State", futureBall.pos, 0.07, color, true)
	vis.addCircle("t/a/shoot: State", targetPos, 0.07, color, true)
	vis.addPath("t/a/shoot: State", {futureBall.pos, targetPos}, color, nil, nil, 0.03)
end

function Shoot:_doShoot(targetPos, targetSpeed, targetTime, ballReceiptPos, linearShoot, precision)
	local futureBall, futureBallTime = self:_calculateFutureBall(ballReceiptPos)
	debug.set("Shoot/futureBallTime", futureBallTime)
	local chaseFutureBall = self:_calculateChaseFutureBall(targetPos)

	self._state = self:_getState(targetPos, futureBall, futureBallTime, targetTime, chaseFutureBall)
	debug.set("Shoot/State", self._state)

	self._linearShoot = linearShoot
	self._precision = precision or MIN_PRECISION

	local color
	if self._state == "StationaryBall" then
		self:_shootStationaryBall(targetPos, targetSpeed, targetTime, futureBall)
		color = vis.colors.whiteHalf
	elseif self._state == "ChaseBall" then
		self:_shootChaseBall(targetPos, targetSpeed, chaseFutureBall)
		color = vis.colors.skyBlueHalf
	elseif self._state == "Volley" then
		self:_shootVolley(targetPos, targetSpeed, futureBall, futureBallTime)
		color = vis.colors.greenHalf
	else -- "StopBall"
		self:_shootStopBall(futureBall, futureBallTime)
		color = vis.colors.redHalf
	end

	if self._state ~= "StationaryBall" then
		self._directMovement = false
	end

	self._visualizeShoot(futureBall, targetPos, color)

	self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	self._send.shootDestination("all", targetPos)

	self._lastTargetPos = targetPos
end

--- shoot the ball such that it reaches targetPos with a speed of targetSpeed
-- This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
-- and ignoreOpponentRobots obstacle parameters
-- @param targetPos Vector - where to shoot at
-- @param targetSpeed number - the velocity of the ball when it reaches targetPos
-- @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_shoot(targetPos, targetSpeed, targetTime, ballReceiptPos, precision)
	self:_doShoot(targetPos, targetSpeed, targetTime, ballReceiptPos, true, precision)
end

--- chips the ball such that it hits the ground at firstContactPos
-- This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
-- and ignoreOpponentRobots obstacle parameters
-- @param firstContactPos Vector - where the ball hits the ground the first time
-- @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_chipToPos(firstContactPos, targetTime, ballReceiptPos, precision)
	self:_doShoot(firstContactPos, 8, targetTime, ballReceiptPos, false, precision)
end

--- chips the ball such that it can be accepted at rollingBallPos
-- This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
-- and ignoreOpponentRobots obstacle parameters
-- @param rollingBallPos Vector - where the ball is starting to roll
-- @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_chipPass(rollingBallPos, ballReceiptPos, targetTime, precision, manualChipDistFactor)
	local origin
	if ballReceiptPos and (ballReceiptPos - World.Ball.pos):dot(World.Ball.speed) > 0
		and World.Ball.speed:length() > 0.5 then
		origin = ballReceiptPos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
	else
		origin = World.Ball.pos
	end
	local firstContactPos = origin + (rollingBallPos - origin):scaleLength(manualChipDistFactor or CHIP_PASS_DISTANCE_FACTOR)
	self:_chipToPos(firstContactPos, targetTime, ballReceiptPos, precision)
end

function Shoot:_shootFreeKick(targetPos, targetSpeed, targetTime, precision)
	self._linearShoot = true
	self._precision = precision or MIN_PRECISION
	self:_shootStationaryBall(targetPos, targetSpeed, targetTime, World.Ball)

	self._visualizeShoot(World.Ball, targetPos, vis.colors.whiteHalf)

	self._lastTargetPos = targetPos
end

return Shoot
