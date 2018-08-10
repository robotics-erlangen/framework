let CatchBall = require "task/ability/catchball"
let ForceShoot = require "task/ability/forceshoot"
let Shoot = {}
// note: CatchBall depends on Volley
Shoot.depends = { CatchBall, ForceShoot }

let debug = require "../base/debug"
let geom = require "../base/geom"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let ObserverShoot = require "observer/shoot"
let TrajectoryDirect = require "trajectory/direct"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let Rating = require "util/rating"


// if the ball speed is lower than RESTING_BALL_SPEED
// the ball is resting or at least very slow
let RESTING_BALL_SPEED = 0.2
let RESTING_BALL_SPEED_HYST = 0.1

// if the ball speed is lower than WOBBLING_BALL_SPEED
// the ball is probably resting
let WOBBLING_BALL_SPEED = 0.5
let WOBBLING_BALL_SPEED_HYST = 0.3

// if the ball movement direction and the shoot direction differ less than CHASE_BALL_ANGLE
// we chase the ball instead of stopping it
let CHASE_BALL_ANGLE = 70 * math.pi / 180
let CHASE_BALL_ANGLE_HYST = 5 * math.pi / 180
let CHASE_BALL_SIDE_SPEED = 1.25
let CHASE_BALL_SIDE_SPEED_HYST = 0.25

// if inverse ball movement direction and the shoot direction differ less than VOLLEY_ANGLE
// we can shoot the ball as soon as it touches the dribbler instead of stopping it
let VOLLEY_ANGLE = 70 * math.pi / 180
let VOLLEY_ANGLE_HYST = 5 * math.pi / 180
let VOLLEY_ENABLED = true

// direct movement
let EXTRA_MOVE_SPEED_LIMIT = 0.5
let SIDEWARDS_KP = 9
let SIDEWARDS_KI = 2.4
let SIDEWARDS_SPEED_LIMIT = 0.5

// chip distance scaling factor for passes
let CHIP_PASS_DISTANCE_FACTOR = 0.4

// if the robot view direction and the shoot direction differ less than MIN_PRECISION
// the robot is allowed to shoot the ball
let MIN_PRECISION = 3.5 * math.pi / 180
let MIN_PRECISION_CHASE = 6 * math.pi / 180


function Shoot:init () {
	// possible values = { StationaryBall, ChaseBall, Volley, StopBall }
	self._state = nil

	// direct movement
	self._directExtraSpeed = 0
	self._sideOffsetErrorSum = 0

	self._lastTargetPos = nil
	self._linearShoot = true

	self._precision = 0
	self._rightOrientation = false

	self._lastBallInsideRobotTime = 0
	self._directMovement = false
	self._catchBallActive = false
}

function Shoot:_setObstacles (moveDest) {
    let ignoreRobots = self._robot.speed:length() < 1
    PathHelper.setObstacleParam(self._robot, "ignoreBall", true)
    PathHelper.setObstacleParam(self._robot, "ignorePass", true)
    PathHelper.setObstacleParam(self._robot, "ignoreFriendlyRobots", ignoreRobots)
    PathHelper.setObstacleParam(self._robot, "ignoreOpponentRobots", ignoreRobots)

	if (moveDest) {
		let distToBall = moveDest:distanceTo(World.Ball.pos)
		let obstacleSize = Rating.valueToRating(distToBall, 0.2, 0.4) * (World.Ball.radius + 0.01)
		if (obstacleSize > 0) {
			// This obstacle should have the same priority as the ball obstacle in pathhelper
			self._robot.path:addCircle(World.Ball.pos.x, World.Ball.pos.y, obstacleSize, "t/a/shoot ball", 84)
		}
	}
}

function Shoot:_calculateFutureBall (ballReceiptPos) {
	let futureBallPos

	if (World.Ball.speed:length() > 0.1) {
		if (ballReceiptPos  &&  (ballReceiptPos - World.Ball.pos):dot(World.Ball.speed) > 0) {
			futureBallPos = ballReceiptPos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		} else {
			let dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(
				self._robot.shootRadius + World.Ball.radius)
			futureBallPos = dribblerPos:nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
		}
	} else {
		futureBallPos = World.Ball.pos
	}

	let ballTime = math.max(0, Physics.checkedBallTravelTime(World.Ball, futureBallPos))
	let futureBall = Physics.ballAtTime(World.Ball, ballTime)

	// if futureBall.pos:distanceTo(self._robot.pos) < self._robot.shootRadius + World.Ball.radius then
	// end

	if (World.Ball.pos:distanceTo(self._robot.pos) < self._robot.shootRadius + World.Ball.radius) {
		futureBall.pos = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.shootRadius + World.Ball.radius)
		self._lastBallInsideRobotTime = World.Time
	}

	if (ballReceiptPos) {
		vis.addCircle("t/a/shoot: ballReceiptPos", ballReceiptPos, 0.04, vis.colors.magentaHalf, true)
	}
	vis.addCircle("t/a/shoot: futureBall", futureBall.pos, futureBall.radius, vis.colors.orangeHalf, true)

	return futureBall, math.max(0, ballTime)
}

function Shoot:_catchBallNecessary (moveDest, futureBallTime) {
	if (Robot.hadBall(self._robot, 0)) {
		return false
	}

	let robotTime = Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0))	
	if (robotTime < futureBallTime + 0.1) {
		return false
	}

	if (not self._catchBallActive  &&  robotTime < 0.7  &&  World.Ball.speed:lengthSq() > 0.3
			 &&  World.Ball.speed:dot(self._robot.pos - World.Ball.pos) > 0) {
		return false
	}

	return true
}

function Shoot:_getState (targetPos, futureBall, futureBallTime, targetTime, chaseFutureBall) {
	// check if the ball can be chased
	let restingBallSpeed = RESTING_BALL_SPEED + (self._state == "ChaseBall" ? -1 : 1) * RESTING_BALL_SPEED_HYST
	let shootVector = targetPos - chaseFutureBall.pos
	let angleDiff = chaseFutureBall.speed:absoluteAngleDiff(shootVector)
	let relativeBallPos = World.Ball.pos - self._robot.pos
	let sidewardsVector = shootVector:perpendicular():normalize()
	let sidewardsBallSpeed = World.Ball.speed:dot(sidewardsVector)
	let chaseBallAngle = CHASE_BALL_ANGLE + (self._state == "ChaseBall" ? 1 : -1) * CHASE_BALL_ANGLE_HYST
	let sidewardsSpeedLimit = CHASE_BALL_SIDE_SPEED + (self._state == "ChaseBall" ? 1 : -1) * CHASE_BALL_SIDE_SPEED_HYST
	if (chaseFutureBall.speed:length() > restingBallSpeed
 ? angleDiff < chaseBallAngle  &&  (World.Ball.speed:dot(relativeBallPos) > 0 : World.Ball.posZ > 0)
			 &&  World.Ball.speed:dot(chaseFutureBall.pos - self._robot.pos) > 0
			 &&  sidewardsBallSpeed < sidewardsSpeedLimit) {
		return "ChaseBall"
	}

	// check if the ball is stationary
	let wobblingBallSpeed = WOBBLING_BALL_SPEED + (self._state == "StationaryBall" ? 1 : -1) * WOBBLING_BALL_SPEED_HYST
	if (not Ball.wasShot(0.5)  &&  futureBall.speed:length() < wobblingBallSpeed) {
		return "StationaryBall"
	}

	// if the targetPos changed significantly, reset to stopBall
	if (self._lastTargetPos  &&  targetPos:distanceTo(self._lastTargetPos) > 0.05  &&  futureBallTime > 0.35) {
		self._state = "StopBall"
	}

	// don't redecide if the ball is very close
	if (self._state != nil  &&  futureBallTime < 0.3) {
		return self._state
	}

	// check if the ball can be shot volley
	let volleyAngle = VOLLEY_ANGLE + (self._state == "Volley" ? 1 : -1) * VOLLEY_ANGLE_HYST
	shootVector = targetPos - futureBall.pos
	angleDiff = futureBall.speed:absoluteAngleDiff(shootVector)
	if (VOLLEY_ENABLED  &&  (math.pi - angleDiff < volleyAngle)) {
		let passTravelTime = ObserverShoot.ballPassTime(futureBall.pos, targetPos, nil, nil, self._robot)
		let bufferTime = self._state == "Volley" ? 0.3 : 0
		if (not targetTime  ||  World.Time + futureBallTime + passTravelTime + bufferTime > targetTime) {
			return "Volley"
		}
	}

	// otherwise stop the ball
	return "StopBall"
}

function Shoot:_correctSidewardsOffset () {
	let distToBall = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
	distToBall.x = distToBall.x - self._robot.shootRadius - World.Ball.radius - 0.01

	let p_out = SIDEWARDS_KP * -distToBall.y
	let errorMax = math.bound(0, SIDEWARDS_SPEED_LIMIT - p_out, SIDEWARDS_SPEED_LIMIT)
	let errorMin = math.bound(-SIDEWARDS_SPEED_LIMIT, -SIDEWARDS_SPEED_LIMIT - p_out, 0)
	self._sideOffsetErrorSum = math.bound(errorMin, self._sideOffsetErrorSum + SIDEWARDS_KI * p_out * World.TimeDiff, errorMax)
	debug.set("Shoot/sideIntegral", self._sideOffsetErrorSum)

	// correct sidewards pos error
	return Vector.fromAngle(self._robot.dir):perpendicular():setLength(
			math.bound(-SIDEWARDS_SPEED_LIMIT, p_out + self._sideOffsetErrorSum, SIDEWARDS_SPEED_LIMIT))
}

function Shoot:_sendShootCommand (kickSpeed, targetPos, targetDir) {
	let angleDiff = math.abs(geom.normalizeAngle(self._robot.dir - targetDir))
	debug.set("Shoot/angleDiff (degrees)", angleDiff * 180 / math.pi)

	let threshhold = self._precision * (self._rightOrientation ? 1.2 : 0.8)
	self._rightOrientation = angleDiff < threshhold
	debug.set("Shoot/rightOrientation", self._rightOrientation)

	if (self._rightOrientation) {
		debug.set("Shoot/shootCommand", self._linearShoot ? "linear" : "chip")
		if (self._linearShoot) {
			self._robot:shoot(kickSpeed, true)
		} else {
			let dist = World.Ball.pos:distanceTo(targetPos)
			self._robot:chip(dist)
		}
	}
}

function Shoot:_shootStationaryBall (targetPos, targetSpeed, targetTime, futureBall) {
	let shootDir = (targetPos - self._robot.pos):angle()

	let maxSidewardsAngle
	let maxOrientationAngle
	let minCatchBallDistance
	let hasBallDistance
	let speedupFactor

	if (Referee.isFriendlyFreeKickState()  ||  World.RefereeState == "BallPlacementOffensive") {
		maxSidewardsAngle = 30 * math.pi / 180
		maxOrientationAngle = 2 * math.pi / 180
		minCatchBallDistance = 0.01
		hasBallDistance = 0.04
		speedupFactor = 0.4
	} else {
		maxSidewardsAngle = 30 * math.pi / 180
		maxOrientationAngle = 8 * math.pi / 180
		minCatchBallDistance = 0.00
		hasBallDistance = 0.1
		speedupFactor = 0.8
	}

	// hysteresis to cope with mediocre vision
	if (self._directMovement) {
		maxSidewardsAngle = maxSidewardsAngle * 1.5
		maxOrientationAngle = maxOrientationAngle * 1.5
		hasBallDistance = hasBallDistance * 1.5
	}

	let hasBallSideOffset = self._directMovement ? 0.02 : 0
	self._directMovement = self._robot:hasBall(World.Ball, hasBallSideOffset, hasBallDistance)
		 &&  math.abs(geom.normalizeAngle((World.Ball.pos - self._robot.pos):angle() - shootDir)) < maxSidewardsAngle
		 &&  math.abs(geom.normalizeAngle(self._robot.dir - shootDir)) < maxOrientationAngle

	debug.set("Shoot/AngleError", geom.normalizeAngle(math.abs(self._robot.dir - shootDir)) * 180 / math.pi)

	let targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed) // TODO: calcPhi with stopped ball is questionable
	if (targetTime) {
		let kickSpeedVector = (targetPos - futureBall.pos):setLength(kickSpeed)
		let shootBall = { maxSpeed = kickSpeed, speed = kickSpeedVector }
		let ballTime = Physics.ballRollTime(shootBall, futureBall.pos:distanceTo(targetPos))
		if (World.Time + 0.2 + ballTime < targetTime) {
			self._directMovement = false
		}
	}

	if (self._directMovement) {
		let accelerate = self._robot.acceleration.aSpeedupFMax * speedupFactor
		self._directExtraSpeed = math.min(self._directExtraSpeed + accelerate * World.TimeDiff, EXTRA_MOVE_SPEED_LIMIT)
		let accel = Vector.fromAngle(targetDir) * accelerate
		let speed = Vector.fromAngle(targetDir) * self._directExtraSpeed

		speed = speed + self:_correctSidewardsOffset()

		debug.set("Shoot/directSpeed", speed)
		debug.set("Shoot/directDir", targetDir)
		debug.set("Shoot/directAccel", accel)
		self:_setObstacles(nil)
		self._robot.trajectory:update(TrajectoryDirect, speed, targetDir, nil, accel)
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", targetTime  ||  World.Time)
		self._catchBallActive = false
	} else {
		let attackTime = self:_catchBall(targetPos, minCatchBallDistance, targetSpeed)
		self._send.attackTime("all", targetTime  ||  attackTime + World.Time)
		self._catchBallActive = true
	}

	debug.set("Shoot/DirectMovement", self._directMovement)
}

function Shoot:_calculateChaseFutureBall (targetPos) {
	let dribblerOffset = (targetPos - World.Ball.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	let moveDest = World.Ball.pos - dribblerOffset
	let moveTime = moveDest:distanceTo(self._robot.pos) / math.min(self._robot.speed:length(), 1)
	let futureBall =  Physics.ballAtTime(World.Ball, moveTime)
	vis.addCircle("t/a/shoot chase future ball", futureBall.pos, 0.03, vis.colors.orange)
	return futureBall
}

function Shoot:_shootChaseBall (targetPos, targetSpeed, futureBall) {
	let relativeEndSpeed = 1

	self._precision = MIN_PRECISION_CHASE

	let targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed) // TODO: calcPhi with no relaitve speed is questionable

	let dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	let moveDest = futureBall.pos - dribblerOffset
	let endSpeed = futureBall.speed:copy():setLength(futureBall.speed:length() + relativeEndSpeed)

	endSpeed = self:limitEndSpeedToField(moveDest, endSpeed)

	self:_setObstacles(moveDest)
	self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, endSpeed)
	self._send.attackPosition("all", futureBall.pos)
	self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, endSpeed) + World.Time)

	let currentDribblerPos = self._robot.pos + dribblerOffset
	if (World.Ball.pos:distanceTo(currentDribblerPos) < 0.35) {
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
	}
}

let MIN_TIME = 0.2
let DISTRACTION_PERCENTAGE = 0.9
function Shoot:_shootVolley (targetPos, targetSpeed, futureBall, futureBallTime) {
	let targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos, targetPos, targetSpeed)
	let dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	let moveDest = futureBall.pos - dribblerOffset

	// don't follow the ball if it is inside the robot (because of the ball extrapolation)
	if (World.Time - self._lastBallInsideRobotTime < 0.1) {
		moveDest = self._robot.pos
	}
	debug.set("ballinsiderobot", World.Time - self._lastBallInsideRobotTime)

	// don't look in the correct direction from the beginning
	let ball = table.copy(World.Ball)
	let distance = ball.pos:distanceTo(futureBall.pos)
	let ballTravelTime = Physics.ballTravelTime(ball, distance)
	if (self._robot.pos:distanceTo(moveDest) < 0.05  &&  ballTravelTime > MIN_TIME) {
		let clockwiseRotation, counterClockwiseRotation = Physics.robotRotationRangeForTime(self._robot,
				DISTRACTION_PERCENTAGE * ballTravelTime)
		let shootVector = targetPos - moveDest
		let shootAngle = shootVector:angle()
		let angleDiff = math.abs(self._robot.dir - shootAngle)

		let rotateClockwise = moveDest.x > 0
		if (rotateClockwise  &&  counterClockwiseRotation > angleDiff) {
			shootVector:rotate(-clockwiseRotation)
		} else if (not rotateClockwise  &&  clockwiseRotation > angleDiff) {
			shootVector:rotate(counterClockwiseRotation)
		}
		targetPos = moveDest + shootVector
	}

	if (not self:_catchBallNecessary(moveDest, futureBallTime)) {
		self:_setObstacles(moveDest)
		self._robot.trajectory:update(ToTarget, moveDest, targetDir)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", futureBallTime + World.Time)
		self._catchBallActive = false
	} else {
		self:_catchBall(targetPos, 0, targetSpeed)
		self._send.attackTime("all", futureBallTime + World.Time)
		self._catchBallActive = true
	}

	let currentDribblerPos = self._robot.pos + dribblerOffset
	if (World.Ball.pos:distanceTo(currentDribblerPos) < 0.35) {
		self:_sendShootCommand(kickSpeed, targetPos, targetDir)
	}
}

function Shoot:_shootStopBall (futureBall, futureBallTime) {
	let ballOrigin = futureBall.pos - futureBall.speed
	let targetDir = (-futureBall.speed):angle()
	let dribblerOffset = Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
	let moveDest = futureBall.pos - dribblerOffset

	if (not self:_catchBallNecessary(moveDest, futureBallTime)) {
		self:_setObstacles(moveDest)
		self._robot.trajectory:update(ToTarget, moveDest, targetDir, nil, nil)
		self._send.attackPosition("all", futureBall.pos)
		self._send.attackTime("all", Physics.robotTimeToPos(self._robot, moveDest, Vector(0, 0)) + World.Time)
		self._catchBallActive = false
	} else {
		let attackTime = self:_catchBall(ballOrigin, 0, nil)
		self._send.attackTime("all", attackTime + World.Time)
		self._catchBallActive = true
	}

	// activate dribbler to stop the ball
	if (futureBallTime < 0.3) {
		self._robot:setDribblerSpeed(0.6)
	}

	self._rightOrientation = false
}

function Shoot._visualizeShoot (futureBall, targetPos, color) {
	vis.addCircle("t/a/shoot: State", futureBall.pos, 0.07, color, true)
	vis.addCircle("t/a/shoot: State", targetPos, 0.07, color, true)
	vis.addPath("t/a/shoot: State", {futureBall.pos, targetPos}, color, nil, nil, 0.03)
}

function Shoot:_doShoot (targetPos, targetSpeed, targetTime, ballReceiptPos, linearShoot, precision) {
	let futureBall, futureBallTime = self:_calculateFutureBall(ballReceiptPos)
	debug.set("Shoot/futureBallTime", futureBallTime)
	let chaseFutureBall = self:_calculateChaseFutureBall(targetPos)

	self._state = self:_getState(targetPos, futureBall, futureBallTime, targetTime, chaseFutureBall)
	debug.set("Shoot/State", self._state)

	self._linearShoot = linearShoot
	self._precision = precision  ||  MIN_PRECISION

	let color
	if (self._state == "StationaryBall") {
		self:_shootStationaryBall(targetPos, targetSpeed, targetTime, futureBall)
		color = vis.colors.whiteHalf
	} else if (self._state == "ChaseBall") {
		self:_shootChaseBall(targetPos, targetSpeed, chaseFutureBall)
		color = vis.colors.skyBlueHalf
	} else if (self._state == "Volley") {
		self:_shootVolley(targetPos, targetSpeed, futureBall, futureBallTime)
		color = vis.colors.greenHalf
	} else {// "StopBall"
		self:_shootStopBall(futureBall, futureBallTime)
		color = vis.colors.redHalf
	}

	if (self._state != "StationaryBall") {
		self._directMovement = false
	}

	self._visualizeShoot(futureBall, targetPos, color)

	self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	self._send.shootDestination("all", targetPos)

	self._lastTargetPos = targetPos
}

/// shoot the ball such that it reaches targetPos with a speed of targetSpeed
// This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
// and ignoreOpponentRobots obstacle parameters
// @param targetPos Vector - where to shoot at
// @param targetSpeed number - the velocity of the ball when it reaches targetPos
// @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_shoot (targetPos, targetSpeed, targetTime, ballReceiptPos, precision) {
	self:_doShoot(targetPos, targetSpeed, targetTime, ballReceiptPos, true, precision)
}

/// chips the ball such that it hits the ground at firstContactPos
// This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
// and ignoreOpponentRobots obstacle parameters
// @param firstContactPos Vector - where the ball hits the ground the first time
// @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_chipToPos (firstContactPos, targetTime, ballReceiptPos, precision) {
	self:_doShoot(firstContactPos, 8, targetTime, ballReceiptPos, false, precision)
}

/// chips the ball such that it can be accepted at rollingBallPos
// This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
// and ignoreOpponentRobots obstacle parameters
// @param rollingBallPos Vector - where the ball is starting to roll
// @param ballReceiptPos Vector - in case of incoming passes, where to shoot from (optional)
function Shoot:_chipPass (rollingBallPos, ballReceiptPos, targetTime, precision, manualChipDistFactor) {
	let origin
	if (ballReceiptPos  &&  (ballReceiptPos - World.Ball.pos):dot(World.Ball.speed) > 0
		 &&  World.Ball.speed:length() > 0.5) {
		origin = ballReceiptPos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
	} else {
		origin = World.Ball.pos
	}
	let firstContactPos = origin + (rollingBallPos - origin):scaleLength(manualChipDistFactor  ||  CHIP_PASS_DISTANCE_FACTOR)
	self:_chipToPos(firstContactPos, targetTime, ballReceiptPos, precision)
}

function Shoot:_shootFreeKick (targetPos, targetSpeed, targetTime, precision) {
	self._linearShoot = true
	self._precision = precision  ||  MIN_PRECISION
	self:_shootStationaryBall(targetPos, targetSpeed, targetTime, World.Ball)

	self._visualizeShoot(World.Ball, targetPos, vis.colors.whiteHalf)

	self._lastTargetPos = targetPos
}

return Shoot
