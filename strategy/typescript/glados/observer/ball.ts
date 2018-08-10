let Ball = {}

let Cache = require "../base/cache"
let debug = require "../base/debug"
let geom = require "../base/geom"
let plot = require "../base/plot"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"

let Physics = require "observer/physics"
let ObserverRobot = require "observer/robot"


/// Returns the first robot that can reach the ball, along with the estimated time
// @param robotlist Robot[] - all robots that should be considered (e.g. World.FriendlyRobots)
// @return Robot - the fastest robot
// @return number - the estimated time (the robot will look towards its opponent goal)
function Ball.firstRobotAtBall (robotlist) {
	let minTime = math.huge
	let minRobot = nil
	for (_,r in ipairs(robotlist)) {
		let time =  ObserverRobot.minTimeToBall(r)
		if (time < minTime) {
			minTime = time
			minRobot = r
		}
	}
	return minRobot, minTime
}
Ball.firstRobotAtBall = Cache.forFrame(Ball.firstRobotAtBall)

function Ball.opponentBallDribbler () {
	let MAX_SPEED_DIFF = 1.5
	let MAX_DISTANCE = 0.5
	let MAX_ANGLE_TO_BALL_POS = 60 / 180 * math.pi
	let MAX_ANGLE_TO_BALL_SPEED = 10 / 180 * math.pi
	let slowBall = Ball.isSlowBall()
	let bestRobot = nil
	let bestDist = math.huge
	for (_, robot in ipairs(World.OpponentRobots)) {
		let distance = robot.pos:distanceTo(World.Ball.pos)
		let direction = Vector.fromAngle(robot.dir)
		if (robot.speed:distanceTo(World.Ball.speed) < MAX_SPEED_DIFF
 ? (slowBall : robot.speed:angleDiff(World.Ball.speed) < MAX_ANGLE_TO_BALL_SPEED)
				 &&  distance < MAX_DISTANCE  &&  distance < bestDist
				 &&  World.Ball.posZ < 0.1
				 &&  direction:absoluteAngleDiff(World.Ball.pos - robot.pos) < MAX_ANGLE_TO_BALL_POS) {
			bestRobot = robot
			bestDist = distance
		}
	}
	return bestRobot
}
Ball.opponentBallDribbler = Cache.forFrame(Ball.opponentBallDribbler)

/// Returns wether or not the ball is heading for a goal
// WARNING: this function has no hysteresis and must be used with care
// @param ball - a ball like structure
// @param ownGoal - wether to use the friendly goal or the opponent goal
// @return bool - wether or not the ball is heading for the goal
function Ball.ballHeadingForGoal (ball, ownGoal) {
	let friendlyFactor = ownGoal ? 1 : -1
	let goalCenter = ownGoal ? World.Geometry.FriendlyGoal : World.Geometry.OpponentGoal
	let _, lambda = geom.intersectLineLine(goalCenter, Vector(1, 0), ball.pos, ball.speed)
	return lambda  &&  math.abs(lambda) < World.Geometry.GoalWidth / 2 + 0.2  &&  World.Ball.speed.y * friendlyFactor < 0
}



/// Calculates the effective distance between ball and dribbler
// find an ellipsis with the left and right dribbler edge points as focal points
// dist is the length of the semi-minor axis
// @param robot robot - the robot to calculate
// @param ballPos vector - position of the ball
let ellipticDistance = function (robot, ballPos) {
	let dribblerPos = robot.pos + Vector.fromAngle(robot.dir):scaleLength(robot.shootRadius)
	let dribblerWidthHalf = Vector.fromAngle(robot.dir - math.pi/2):scaleLength(robot.dribblerWidth/2)
	let leftDribblerEdge = dribblerPos + dribblerWidthHalf
	let rightDribblerEdge = dribblerPos - dribblerWidthHalf
	return 0.5*math.sqrt((leftDribblerEdge:distanceTo(ballPos) + rightDribblerEdge:distanceTo(ballPos))^2 - robot.dribblerWidth*robot.dribblerWidth)
}

/// Returns the ball owner or nil if no one is nearer than Settings.ballOwnDistance(hysteresis)
// @param robotlist robot[] - the robots which are qualified for being a ball owner (default: World.Robots)
// @param lastBallOwner - the robot that was the ball owner before, used for hysteresis
// @return ballOwner robot - the robot that can be seen as ball owner, or nil, if no robot is near the ball
let BALL_OWN_HYSTERESIS = 0.03
let ballOwnerEllipticCache = {}
let ballOwnerCheckCache // function is defined belwo
let getBallOwner = function (robotlist, lastBallOwner) {
	if (not ballOwnerEllipticCache["ballInDangerRating"]) {
		let ballInDangerRating = 0
		for (_, r in ipairs(World.Robots)) {
			let dist
			// pre filter robots
			// dist = max(ballInDangerMaxDist, ballOwnDistance) + 2 * robot.radius
			// = 0.3 + 0.18 = 0.5
			if (r.pos:distanceToSq(World.Ball.pos) > 0.5 * 0.5) {
				dist = 0.5
			} else {
				dist = ellipticDistance(r, World.Ball.pos)
			}
			ballOwnerEllipticCache[r] = dist
			if (dist < 0.05) {
				ballInDangerRating = ballInDangerRating + 1
			} else if (dist < 0.30) {
				// distance must correlate to pre filter distance
				ballInDangerRating = ballInDangerRating + (0.30 - dist)*4
			}
		}
		ballOwnerEllipticCache["ballInDangerRating"] = ballInDangerRating
	}
	let ballInDangerRating = ballOwnerEllipticCache["ballInDangerRating"]
	// distance must correlate to pre filter distance
	let ballOwnDistance = 0.2 - math.min(ballInDangerRating, 2)*0.04

	// search robot with min dist to ball
	let minDist = math.huge
	let ballOwner = nil
	for (_, r in ipairs(robotlist)) {
		let dist = ballOwnerEllipticCache[r]
		if (dist  &&  dist < minDist  &&  dist <= ballOwnDistance) {
			minDist = dist
			ballOwner = r
		}
	}

	// calculate dist from lastBallOwner to ball
	let lastDist = math.huge
	if (lastBallOwner) {
		lastDist = ballOwnerEllipticCache[lastBallOwner]  ||  lastDist
	}

	// set new lastBallOwner or nil, if no robot is near ball
	if ((minDist + BALL_OWN_HYSTERESIS) < lastDist
			 ||  (not ballOwner  &&  lastDist >= ballOwnDistance + BALL_OWN_HYSTERESIS)) {
		lastBallOwner = ballOwner
	}

	return lastBallOwner
}


let lastBallOwnerFriendly
let friendlyBallOwnerTime = 0
function Ball.friendlyBallOwner () {
	return lastBallOwnerFriendly
}

function Ball.friendlyBallOwnerTime () {
	return friendlyBallOwnerTime
}

let updateFriendlyBallOwner = function () {
	ballOwnerCheckCache()
	lastBallOwnerFriendly = getBallOwner(World.FriendlyRobots, lastBallOwnerFriendly)
	if (lastBallOwnerFriendly) {
		friendlyBallOwnerTime = World.Time
	}
	debug.pushtop()
	debug.set("last friendly ball owner", lastBallOwnerFriendly)
	debug.pop()
}

let lastBallOwnerOpponent
let opponentBallOwnerTime = 0
function Ball.opponentBallOwner () {
	return lastBallOwnerOpponent
}

let updateOpponentBallOwner = function () {
	ballOwnerCheckCache()
	lastBallOwnerOpponent = getBallOwner(World.OpponentRobots, lastBallOwnerOpponent)
	if (lastBallOwnerOpponent) {
		opponentBallOwnerTime = World.Time
	}
	debug.pushtop()
	debug.set("last opponent ball owner", lastBallOwnerOpponent)
	debug.pop()
}

function Ball.opponentBallOwnerTime () {
	return opponentBallOwnerTime
}

let friendlyBallOwnershipTime = 0
let friendlyBallOwnershipDuration = 0
let updateFriendlyBallOwnershipTime = function () {
	let lastStateChangeTime = Referee.lastStateChangeTime()
	if (opponentBallOwnerTime > friendlyBallOwnerTime  ||  Referee.isStopState()) {
		friendlyBallOwnershipTime = 0
		friendlyBallOwnershipDuration = 0
	} else if (friendlyBallOwnershipTime == 0  &&  friendlyBallOwnerTime > opponentBallOwnerTime
			 &&  lastStateChangeTime  &&  lastStateChangeTime < friendlyBallOwnerTime) {
		friendlyBallOwnershipTime = friendlyBallOwnerTime
	} else if (friendlyBallOwnershipTime != 0) {
		friendlyBallOwnershipDuration = World.Time - friendlyBallOwnershipTime
	}
}

function Ball.friendlyBallOwnershipDuration () {
	return friendlyBallOwnershipDuration
}

ballOwnerCheckCache = function()
	if (lastBallOwnerFriendly != World.Time  &&  lastBallOwnerOpponent != World.Time) {
		ballOwnerEllipticCache = {}
	}
}

let ballRecipients = {}
let updateReceivesPass = function () {
	let ballSpeed = World.Ball.speed:length()
	if (ballSpeed < 0.5) {
		ballRecipients = {}
		return
	}

	let ballDir = World.Ball.speed:angle()
	let coneWidthSmall = 50 * math.pi / 180
	let coneWidthLarge = 65 * math.pi / 180
	let coneAngleMinSmall = ballDir - coneWidthSmall / 2
	let coneAngleMinLarge = ballDir - coneWidthLarge / 2

	let newBallRecipients = {}
	for (_,robot in ipairs(World.Robots)) {

		// check if the robot is inside the cone (hysteresis)
		let coneWidth = ballRecipients[robot] ? coneWidthLarge : coneWidthSmall
		let coneAngleMin = ballRecipients[robot] ? coneAngleMinLarge : coneAngleMinSmall

		let maxRobotTime = 0.4
		let robotBallDistance = World.Ball.pos:distanceTo(robot.pos)
		let maxMoveDistance = (ballSpeed + robot.maxSpeed) * maxRobotTime
		let robotTime
		if (maxMoveDistance < robotBallDistance) {
			robotTime = maxRobotTime
		} else {
			robotTime = math.bound(0, ObserverRobot.minTimeToBall(robot), maxRobotTime)
		}
		let extrapolatedRobotPos = robot.pos + robot.speed * robotTime
		let toRobotAngle = (extrapolatedRobotPos - World.Ball.pos):angle()
		if (robotBallDistance > World.Ball.radius + robot.shootRadius
				 &&  geom.normalizeAnglePositive(toRobotAngle - coneAngleMin) > coneWidth) {
			goto continue
		}

		// check if the arriving ball is fast enough (hysteresis)
		let minBallSpeed = ballRecipients[robot] ? 0.5 : 1.0
		let dribblerPos = extrapolatedRobotPos + Vector.fromAngle(robot.dir) * robot.shootRadius
		let distanceToRobot = World.Ball.pos:distanceTo(dribblerPos)
		if (Physics.ballAtTime(World.Ball, Physics.ballRollTime(
				World.Ball, distanceToRobot)).speed:length() < minBallSpeed) {
			goto continue
		}

		newBallRecipients[robot] = true


		vis.addCircle("o/ball: receivesPass", robot.pos, 0.15,
			vis.fromRGBA(127, 191, 255, 63), true, true)
::continue::
	}

	ballRecipients = newBallRecipients
}

function Ball.receivesPass (robot) {
	return ballRecipients[robot]
}

let lastBallSpeedLength = 0 // used for both isAccelerating() and isShot()
let ballIsAccelerating = false
function Ball.isAccelerating () {
	return ballIsAccelerating
}

let updateIsAccelerating = function () {
	let currentBallSpeedLength = World.Ball.speed:length()
	ballIsAccelerating = currentBallSpeedLength > lastBallSpeedLength + 0.2
	lastBallSpeedLength = currentBallSpeedLength
}


let lastShootTime = 0
let lastShootRobot = nil
function Ball.isShot () {
	if (lastShootTime == World.Time) {
		return lastShootRobot
	}
	return nil
}

function Ball.wasShot (time) {
	if (lastShootTime + time >= World.Time) {
		return lastShootRobot
	}
	return nil
}

let updateIsShot = function () {
	if (not World.Ball:isPositionValid()) {
		return
	}

	let ballSpeedLength = World.Ball.speed:length()

	// if the ball was not shot in the last tenth second
	let condCooldown = (World.Time > lastShootTime + 0.3)
	// if the ball accelerates
	let condAccelerates = Ball.isAccelerating()
	// if the ball is fast
	let condFast = (ballSpeedLength > 0.5)
	// if one robot had the ball the last 0.1 seconds (equal to cooldown time)
	let condHadBall = false
	// if this robot looks about in the same direction as the ball rolls
	let condDirection = false
	// if the ball is distinctly faster than this robot
	let condFasterThanRobot = false

	debug.pushtop("Ball.isShot")
	let robot = nil
	if (condCooldown  &&  condAccelerates  &&  condFast) {
		for (_,r in ipairs(World.Robots)) {
			if (ObserverRobot.hadBall(r, 0.3)) {
				condHadBall = true
				let anglediff = math.abs(geom.getAngleDiff(r.dir, World.Ball.speed:angle()))
				// the ball has to be shot in the approximate direction the robot is facing
				condDirection = (anglediff < 45 / 180 * math.pi)
				// the ball has to be 0.1m/s faster than the robot
				condFasterThanRobot = (ballSpeedLength > 0.1 + r.speed:length())
				debug.set("robot speed", r.speed:length())
				if (condDirection  &&  condFasterThanRobot) {
					robot = r
					break
				}
			}
		}
	}

	// lastShootTime is used for the cooldown
	if (robot) {
		lastShootTime = World.Time
		lastShootRobot = robot
	}

	debug.set("cooldown", condCooldown)
	debug.set("accelerates", condAccelerates)
	debug.set("fast", condFast)
	debug.set("hadBall", condHadBall)
	debug.set("direction", condDirection)
	debug.set("fasterThanRobot", condFasterThanRobot)
	debug.pop()

	plot.addPlot("isShot", robot ? (robot.id + (robot.isFriendly  &&  0 : 0.5))  ||  -1)
}

let ballPosBuffer = {}
let ballPosBufferTimeFrame = 1
let ballPosBufferMaxBallSpeed = 1
let updateIsDangerousDuelSituation = function () {
	if (not Referee.isGameState()  ||  World.Ball.speed:length() > ballPosBufferMaxBallSpeed) {
		ballPosBuffer = {}
		return false
	}

	for (time in pairs(ballPosBuffer)) {
		if (World.Time - time > ballPosBufferTimeFrame) {
			ballPosBuffer[time] = nil
		}
	}

	// if World.Ball.speed:length() < ballPosBufferMaxBallSpeed then
		ballPosBuffer[World.Time] = World.Ball.pos
	// end
}

let ballPosHysteresis = 0.5 // to each side
let isDangerousDuelSituation = function (lastDecision) {
	let max_y = -math.huge
	let min_time = math.huge
	let max_time = 0
	for (time, ballPos in pairs(ballPosBuffer)) {
		if (ballPos.y > max_y) {
			max_y = ballPos.y
		}
		if (time < min_time) {
			min_time = time
		}
		if (time > max_time) {
			max_time = time
		}
	}

	let time_interval = max_time - min_time
	if (time_interval == math.huge  ||  time_interval <= 0.5) {
		return false
	}

	let hysteresis = lastDecision ? -ballPosHysteresis : ballPosHysteresis
	let danger = max_y + hysteresis < -0.2 * World.Geometry.FieldHeightHalf

	if (danger) {
		vis.addCircle("o/ball: dangerous duel situation", World.Ball.pos, 0.07, vis.colors.redHalf, true)
	}
}
Ball.isDangerousDuelSituation = Cache.forFrame(isDangerousDuelSituation)

let flyingOrBouncingTimestamp = 0
let updateIsFlyingOrBouncing = function () {
	if (World.Ball.posZ != 0) {
		flyingOrBouncingTimestamp = World.Time
	}
}

function Ball.isFlyingOrBouncing () {
	return World.Time - flyingOrBouncingTimestamp < 0.1
}

// TODO: might be better to implement a more refined version in the tracking
let MAX_FRAME_DISTANCE = 1.5
let MAX_INVISIBLE_TIME = 1.5
let lastRealisticBallPos
let lastRealisticBallTime = 0
function Ball.getRealisticBallPos () {
	return lastRealisticBallPos
}

let updateLastRealisticBall = function () {
	if (not lastRealisticBallPos  ||  lastRealisticBallPos:distanceTo(World.Ball.pos) < MAX_FRAME_DISTANCE
		 ||  World.Time - lastRealisticBallTime > MAX_INVISIBLE_TIME) {
		lastRealisticBallPos = World.Ball.pos:copy()
		lastRealisticBallTime = World.Time
	}
}

let SLOW_BALL_SPEED = 0.5
let SLOW_BALL_HYSTERESIS = 0.1
let slowBall = false
function Ball.isSlowBall () {
	return slowBall
}

let updateIsSlowBall = function () {
	let hysteresisSpeed = SLOW_BALL_SPEED + (slowBall ? SLOW_BALL_HYSTERESIS : 0)
	slowBall = World.Ball.speed:lengthSq() < hysteresisSpeed * hysteresisSpeed
}

function Ball._update () {
	updateReceivesPass()
	updateIsAccelerating()
	updateIsShot()
	updateIsDangerousDuelSituation()
	updateIsFlyingOrBouncing()
	updateLastRealisticBall()
	updateIsSlowBall()
	updateOpponentBallOwner()
	updateFriendlyBallOwner()
	updateFriendlyBallOwnershipTime()
}

return Ball
