local CatchBall = require "task/ability/catchball"
local ForceShoot = require "task/ability/forceshoot"
local Shoot = {}
-- note: CatchBall depends on Volley
Shoot.depends = { CatchBall, ForceShoot }

local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local TrajectoryDirect = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"



-- if the ball speed is lower than STATIONARY_BALL_SPEED
-- we pretend that the ball is resting
local STATIONARY_BALL_SPEED = 0.15
local STATIONARY_BALL_SPEED_HYST = 0.05

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


function Shoot:init()
	-- possible values = { StationaryBall, ChaseBall, Volley, StopBall }
	self._state = "StationaryBall"

	-- direct movement
	self._directExtraSpeed = 0
	self._sideOffsetErrorSum = 0

	self._lastTargetPos = nil
	self._linearShoot = true

	self._precision = 0
	self._rightOrientation = false
end

function Shoot:_setObstacles()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)
	local ignoreRobots = World.Ball.pos:distanceTo(self._robot.pos) < World.Ball.radius + self._robot.radius + 0.3
	PathHelper.addRobotObstacles(self._robot.path, self._robot, ignoreRobots, ignoreRobots)
end

function Shoot:_calculateFutureBall(ballReceiptPos)
	local futureBallPos

	if World.Ball.speed:length() > 0.1 then
		if ballReceiptPos then
			futureBallPos = ballReceiptPos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		else
			local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(
				self._robot.shootRadius + World.Ball.radius)
			futureBallPos = dribblerPos:nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
		end
	else
		futureBallPos = World.Ball.pos
	end

	local ballTime = Physics.checkedBallRollTime(World.Ball, futureBallPos)
	local futureBall
	if ballTime > 0 then
		futureBall = Physics.ballAtTime(World.Ball, ballTime)
	else
		futureBall = {
			maxSpeed = World.Ball.maxSpeed,
			radius = World.Ball.radius,
			speed = World.Ball.speed,
			pos = futureBallPos
		}
	end

	if ballReceiptPos then
		vis.addCircle("t/a/shoot: ballReceiptPos", ballReceiptPos, 0.04, vis.colors.magentaHalf, true)
	end
	vis.addCircle("t/a/shoot: futureBall", futureBall.pos, futureBall.radius, vis.colors.orangeHalf, true)

	return futureBall, math.max(0, ballTime)
end

function Shoot:_getState(targetPos, futureBall, futureBallTime)
	-- check if the ball is stationary
	local stationaryBallSpeed = STATIONARY_BALL_SPEED + (self._state == "StationaryBall" and 1 or -1) * STATIONARY_BALL_SPEED_HYST
	if futureBall.speed:length() < stationaryBallSpeed then
		return "StationaryBall"
	end

	-- don't spoil volley shots by redeciding
	if self._state == "Volley" and futureBallTime < 0.2 then
		return "Volley"
	end

	-- if the targetPos changed significantly, reset to stopBall
	if self._lastTargetPos and targetPos:distanceTo(self._lastTargetPos) > 0.05 then
		self._state = "StopBall"
	end

	-- check if the ball can be chased
	local shootVector = targetPos - futureBall.pos
	local angleDiff = futureBall.speed:absoluteAngleDiff(shootVector)
	local relativeBallPos = World.Ball.pos - self._robot.pos
	local sidewardsVector = shootVector:perpendicular():normalize()
	local sidewardsBallSpeed = World.Ball.speed:dot(sidewardsVector)
	local chaseBallAngle = CHASE_BALL_ANGLE + (self._state == "ChaseBall" and 1 or -1) * CHASE_BALL_ANGLE_HYST
	local sidewardsSpeedLimit = CHASE_BALL_SIDE_SPEED + (self._state == "ChaseBall" and 1 or -1) * CHASE_BALL_SIDE_SPEED_HYST
	if angleDiff < chaseBallAngle and (World.Ball.speed:dot(relativeBallPos) > 0 or World.Ball.posZ > 0)
			and sidewardsBallSpeed < sidewardsSpeedLimit then
		return "ChaseBall"
	end

	-- don't redecide if the ball is very close
	if futureBallTime < 0.3 then
		return self._state
	end

	-- check if the ball can be shot volley
	local volleyAngle = VOLLEY_ANGLE + (self._state == "Volley" and 1 or -1) * VOLLEY_ANGLE_HYST
	if math.pi - angleDiff < volleyAngle then
		return "Volley"
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

	local threshhold = self._precision * (self._rightOrientation and 1.5 or 0.5)
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

function Shoot:_shootStationaryBall(targetPos, targetSpeed, futureBall)
	local shootDir = (targetPos - self._robot.pos):angle()
	local directMovement = Robot.hadBall(self._robot, 0)
		and math.abs(geom.normalizeAngle((World.Ball.pos - self._robot.pos):angle() - shootDir)) < 30 * math.pi / 180
		and math.abs(geom.normalizeAngle(self._robot.dir - shootDir)) < 3 * math.pi / 180

	debug.set("Shoot/AngleError", geom.normalizeAngle(math.abs(self._robot.dir - shootDir)) * 180 / math.pi)

	if directMovement then
		local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)
		local accelerate = self._robot.acceleration.aSpeedupFMax * 0.5
		self._directExtraSpeed = math.min(self._directExtraSpeed + accelerate * World.TimeDiff, EXTRA_MOVE_SPEED_LIMIT)
		local accel = Vector.fromAngle(targetDir) * accelerate
		local speed = Vector.fromAngle(targetDir) * self._directExtraSpeed

		speed = speed + self:_correctSidewardsOffset()

		debug.set("Shoot/directSpeed", speed)
		debug.set("Shoot/directDir", targetDir)
		debug.set("Shoot/directAccel", accel)
		self:_setObstacles()
		self._robot.trajectory:update(TrajectoryDirect, speed, targetDir, nil, accel)
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", 0)
	else
		self:_catchBall(targetPos, 0, targetSpeed)
	end
	
	debug.set("Shoot/DirectMovement", directMovement)
end

function Shoot:_shootChaseBall(targetPos, targetSpeed)
	local relativeEndSpeed = 1

	local dribblerOffset = (targetPos - World.Ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	local moveDest = World.Ball.pos - dribblerOffset
	local moveTime = moveDest:distanceTo(self._robot.pos) / math.min(self._robot.speed:length(), 1)
	local futureBall = Physics.ballAtTime(World.Ball, moveTime)
	local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)

	dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	moveDest = futureBall.pos - dribblerOffset
	local endSpeed = futureBall.speed:copy():setLength(futureBall.speed:length() + relativeEndSpeed)

	self:_setObstacles()
	self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, endSpeed)
	self._send.attackPosition("all", futureBall.pos)
	self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, endSpeed))

	local currentDribblerPos = self._robot.pos + dribblerOffset
	if World.Ball.pos:distanceTo(currentDribblerPos) < 0.15 then
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
	end
end

function Shoot:_shootVolley(targetPos, targetSpeed, futureBall, futureBallTime)
	local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)
	local dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	local moveDest = futureBall.pos - dribblerOffset

	-- don't follow the ball if it is inside the robot (because of the ball extrapolation)
	if futureBallTime == 0 and World.Ball.pos:distanceTo(self._robot.pos) < self._robot.radius + World.Ball.radius then
		moveDest = self._robot.pos
	end

	local robotTime = Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0))
	if robotTime < futureBallTime + 0.2 or Robot.hadBall(self._robot, 0) then
		self:_setObstacles()
		local endSpeed = Physics.robotMinEndspeed(self._robot, moveDest, math.max(0, futureBallTime))
		self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, endSpeed)
		vis.addPath("t/a/shoot: endSpeed", {moveDest, moveDest + endSpeed}, vis.colors.red, nil, nil, 0.03)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, endSpeed))
	else
		self:_catchBall(targetPos, 0, targetSpeed)
	end

	local currentDribblerPos = self._robot.pos + dribblerOffset
	if World.Ball.pos:distanceTo(currentDribblerPos) < 0.15 then
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
	end
end

function Shoot:_shootStopBall(futureBall, futureBallTime)
	local ballOrigin = futureBall.pos - futureBall.speed
	local targetDir = (-futureBall.speed):angle()
	local dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	local moveDest = futureBall.pos - dribblerOffset

	local robotTime = Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0))
	if robotTime < futureBallTime + 0.1 or Robot.hadBall(self._robot, 0) then
		self:_setObstacles()
		self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, nil)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0)))
	else
		self:_catchBall(ballOrigin, 0, 8)
	end

	self._rightOrientation = false
end

function Shoot:_doShoot(targetPos, targetSpeed, ballReceiptPos, linearShoot, precision)
	local futureBall, futureBallTime = self:_calculateFutureBall(ballReceiptPos)
	debug.set("Shoot/futureBallTime", futureBallTime)

	self._state = self:_getState(targetPos, futureBall, futureBallTime)
	debug.set("Shoot/State", self._state)

	self._linearShoot = linearShoot
	self._precision = precision or MIN_PRECISION

	local color
	if self._state == "StationaryBall" then
		self:_shootStationaryBall(targetPos, targetSpeed, futureBall)
		color = vis.colors.whiteHalf
	elseif self._state == "ChaseBall" then
		self:_shootChaseBall(targetPos, targetSpeed, futureBall)
		color = vis.colors.skyBlueHalf
	elseif self._state == "Volley" then
		self:_shootVolley(targetPos, targetSpeed, futureBall, futureBallTime)
		color = vis.colors.greenHalf
	else -- "StopBall"
		self:_shootStopBall(futureBall, futureBallTime)
		color = vis.colors.redHalf
	end

	vis.addCircle("t/a/shoot: State", futureBall.pos, 0.07, color, true)
	vis.addCircle("t/a/shoot: State", targetPos, 0.07, color, true)
	vis.addPath("t/a/shoot: State", {futureBall.pos, targetPos}, color, nil, nil, 0.03)

	self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	self._send.shootDestination("all", targetPos)

	self._lastTargetPos = targetPos
end

--- shoot the ball such that it reaches targetPos with a speed of targetSpeed
-- @param targetPos Vector - where to shoot at
-- @param targetSpeed Vector - the velocity of the ball when it reaches targetPos
-- @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_shoot(targetPos, targetSpeed, ballReceiptPos, precision)
	self:_doShoot(targetPos, targetSpeed, ballReceiptPos, true, precision)
end

--- chips the ball such that it hits the ground at firstContactPos
-- @param firstContactPos Vector - where the ball hits the ground the first time
-- @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_chipToPos(firstContactPos, ballReceiptPos, precision)
	self:_doShoot(firstContactPos, 8, ballReceiptPos, false, precision)
end

--- chips the ball such that it can be accepted at rollingBallPos
-- @param rollingBallPos Vector - where the ball is starting to roll
-- @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_chipPass(rollingBallPos, ballReceiptPos, precision)
	local origin = ballReceiptPos or World.Ball.pos
	local firstContactPos = origin + (rollingBallPos - origin):scaleLength(CHIP_PASS_DISTANCE_FACTOR)
	self:_chipToPos(firstContactPos, ballReceiptPos, precision)
end

return Shoot
