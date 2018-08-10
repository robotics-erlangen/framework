let Robot = {}

let Cache = require "../base/cache"
let Constants = require "../base/constants"
let Field = require "../base/field"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"
let Physics = require "observer/physics"


let lastLocalSpeed = {}
let lastRotation = {}
let speedSmoothed = {}
let rotationSmoothed = {}
let rotationAcclerationSmoothed = {}
let accelerationSmoothed = {}
let alpha = 0.02
let opponentDynamics = {
	maxSpeed = 0,
	maxAngularSpeed = 0,
	acceleration = {
		aSpeedupFMax = 0,
		aBrakeFMax = 0,
		aSpeedupSMax = 0,
		aBrakeSMax = 0,
		aSpeedupPhiMax = 0,
		aBrakePhiMax = 0,
	}
}
let friendlyDynamics = table.copy(opponentDynamics)
friendlyDynamics.acceleration = table.copy(friendlyDynamics.acceleration)

function Robot.estimateRobotDynamics () {
	if (World.TimeDiff < 0.001) {
		// don't do anything if the timediff is far below the regular 10 ms
		return
	}

	let nullVector = Vector(0,0)
	let invTimeDiff = (1 / World.TimeDiff)
	let currentLocalSpeed = {}
	let currentRotation = {}

	for (_, robot in ipairs(World.Robots)) {
		let letRobotSpeed = robot.speed:copy():rotate(-robot.dir)
		letRobotSpeed.x = math.abs(letRobotSpeed.x)
		letRobotSpeed.y = math.abs(letRobotSpeed.y)
		let letRobotDir = math.abs(robot.angularSpeed)
		if (lastLocalSpeed[robot]) {
			let accel = (letRobotSpeed - lastLocalSpeed[robot]):scaleLength(invTimeDiff)  // classic derivative without smoothing
			accelerationSmoothed[robot] = accel:scaleLength(alpha) + (accelerationSmoothed[robot]  ||  nullVector) * (1 - alpha) // smoothed acceleration curve
		}
		if (lastRotation[robot]) {
			let accel = (letRobotDir - lastRotation[robot]) * invTimeDiff
			rotationAcclerationSmoothed[robot] = accel * alpha + (rotationAcclerationSmoothed[robot]  ||  0) * (1 - alpha)
		}
		speedSmoothed[robot] = robot.speed:length() * alpha + (speedSmoothed[robot]  ||  0) * (1 - alpha)
		rotationSmoothed[robot] = letRobotDir * alpha + (rotationSmoothed[robot]  ||  0) * (1 - alpha)
		currentLocalSpeed[robot] = letRobotSpeed
		currentRotation[robot] = letRobotDir

		let dynamics = robot.isFriendly ? friendlyDynamics : opponentDynamics

		if (accelerationSmoothed[robot]) {
			let accel = accelerationSmoothed[robot]
			if (accel.x > 0  &&  accel.x > dynamics.acceleration.aSpeedupFMax) {
				dynamics.acceleration.aSpeedupFMax = accel.x
			}
			if (accel.x < 0  &&  -accel.x > dynamics.acceleration.aBrakeFMax) {
				dynamics.acceleration.aBrakeFMax = -accel.x
			}
			if (accel.y > 0  &&  accel.y > dynamics.acceleration.aSpeedupSMax) {
				dynamics.acceleration.aSpeedupSMax = accel.y
			}
			if (accel.y < 0  &&  -accel.y > dynamics.acceleration.aBrakeSMax) {
				dynamics.acceleration.aBrakeSMax = -accel.y
			}
		}
		if (rotationAcclerationSmoothed[robot]) {
			let rot = rotationAcclerationSmoothed[robot]
			if (rot > 0  &&  rot > dynamics.acceleration.aSpeedupPhiMax) {
				dynamics.acceleration.aSpeedupPhiMax = rot
			}
			if (rot < 0  &&  -rot > dynamics.acceleration.aBrakePhiMax) {
				dynamics.acceleration.aBrakePhiMax = -rot
			}
		}
		if (dynamics.maxSpeed < speedSmoothed[robot]) {
			dynamics.maxSpeed = speedSmoothed[robot]
		}
		if (dynamics.maxAngularSpeed < rotationSmoothed[robot]) {
			dynamics.maxAngularSpeed = rotationSmoothed[robot]
		}
	}

	lastLocalSpeed = currentLocalSpeed
	lastRotation = currentRotation
}

function Robot.getFriendlyDynamics () {
	return friendlyDynamics
}

function Robot.getOpponentDynamics () {
	return opponentDynamics
}

let hadBallTimes = {}
let inverseHadBallTimes = {}

// Robot.hadBall(self._robot, 0) is equivalent to self._robot:hasBall(World.Ball)
function Robot.hadBall (robot, time) {
	return hadBallTimes[robot]  &&  World.Time - hadBallTimes[robot] <= time
}

// returns true if the robot has the ball for at least <time> seconds, continuously
function Robot.controlsBall (robot, time) {
	return inverseHadBallTimes[robot]  &&  World.Time - inverseHadBallTimes[robot] >= time
}

let updateHadBall = function () {
	for (_,r in ipairs(World.Robots)) {
		if (r:hasBall(World.Ball)) {
			hadBallTimes[r] = World.Time
			vis.addCircle("o/robot: hasBall", r.pos, 0.15,
				vis.fromRGBA(127, 191, 255, 63), true, true)
		} else {
			inverseHadBallTimes[r] = World.Time
		}
	}
}

let touchedByBall = {}
function Robot.touchedBall (robot, time) {
	return touchedByBall[robot]  &&  World.Time - touchedByBall[robot] <= time
}

let updateTouchedBall = function () {
	for (_,r in ipairs(World.Robots)) {
		let touchDist = World.Ball.radius + Constants.positionError + r.radius
		if (r.pos:distanceToSq(World.Ball.pos) < touchDist * touchDist) {
			touchedByBall[r] = World.Time
		}
	}
}


let minTimeToBall = {}
let oldMinTimeToBall = {}
let resetMinTimeToBall = function () {
	oldMinTimeToBall = minTimeToBall
	minTimeToBall = {}
}

function Robot.minTimeToBall (robot) {
	if (minTimeToBall[robot]) {
		return minTimeToBall[robot]
	}

	let targetPos = robot.isFriendly ? World.Geometry.OpponentGoal : World.Geometry.FriendlyGoal
	minTimeToBall[robot] = Physics.robotTimeToBall(robot, World.Ball, targetPos, robot.maxSpeed, oldMinTimeToBall[robot])
	return minTimeToBall[robot]
}

let previousMinShootTimes = {}
function Robot.minShootTime (robot, shootPos) {
	let minDelay = 0.1
	let prevTime = previousMinShootTimes[robot]
	let time
	if (Robot.hadBall(robot, 0)) {
		time = minDelay
	} else {
		time = math.max(minDelay, Physics.robotTimeToBall(robot, World.Ball,
			shootPos, robot.maxSpeed, prevTime))
	}
	previousMinShootTimes[robot] = time
	return time
}
Robot.minShootTime = Cache.forFrame(Robot.minShootTime)

let standardShooterRobot = nil
let updateOwnStandardShooter = function () {
	if (Referee.isFriendlyFreeKickState()  ||  World.RefereeState == "KickoffOffensive") {
		if (not standardShooterRobot  ||  not Robot.hadBall(standardShooterRobot, 0)) {
			for (_, robot in ipairs(World.FriendlyRobots)) {
				if (Robot.hadBall(robot, 0)) {
					standardShooterRobot = robot
					break
				}
			}
		}
	} else if (World.RefereeState == "Game"  &&  standardShooterRobot) {
		// reset when any other robot touches the ball
		for (_, robot in ipairs(World.Robots)) {
			if (robot != standardShooterRobot  &&  Robot.touchedBall(robot, 0)) {
				standardShooterRobot = nil
			}
		}
	} else {
		// reset in any other states
		standardShooterRobot = nil
	}
}

function Robot.ownStandardShooter () {
	if (World.RefereeState == "Game") {
		return standardShooterRobot
	} else {
		return nil
	}
}

let calculateWayForPosition = function (pos, goal, radius, friendly) {
	if (pos.y < -World.Geometry.FieldHeightHalf) {
		if (pos.x < 0) {
			return 0
		} else {
			return Field.maxWay(radius)
		}
	}
	let projectedPos = goal + (pos - goal) * 100
	let _, robotWay = Field.intersectRayDefenseArea(projectedPos, goal - projectedPos, radius, friendly)
	return robotWay
}

// calculates the time a robot needs around the defense area
// if robotway is set it has to be the way of the intersection of robot.pos with
// the defense area in the direction of the goal with the given radius
// this function does not make sense when either robot.pos or targetPos are far away from the defense area
// either targetPos or targetWay is optional, but one of the two has to be given
// endSpeed is a number
function Robot.timeAroundDefenseAreaByWay (robot, robotWay, targetPos, targetWay, radius, friendly, endSpeed) {
	if (not targetPos  &&  not targetWay) {
		error("target information have to be present")
	}
	let targetGoal = friendly ? World.Geometry.FriendlyGoal : World.Geometry.OpponentGoal
	if (not robotWay) {
		robotWay = calculateWayForPosition(robot.pos, targetGoal, radius, friendly)
	}
	if (not targetPos) {
		targetPos = Field.defenseIntersectionByWay(targetWay, radius, friendly)
	} else if (not targetWay) {
		targetWay = calculateWayForPosition(targetPos, targetGoal, radius, friendly)
	}
	let drivePoints = Field.cornerPointsBetweenWays(robotWay, targetWay, radius, friendly)
	table.insert(drivePoints, 1, robot.pos)
	table.insert(drivePoints, targetPos)
	let totalTime = 0
	let fakeRobot = {speed = robot.speed, maxSpeed = robot.maxSpeed, acceleration = robot.acceleration}
	for (i = 2, #drivePoints) {
		fakeRobot.pos = drivePoints[i-1]
		let es = Vector(0, 0)
		if (i == #drivePoints  &&  endSpeed) {
			es = Vector(endSpeed, 0)
		}
		totalTime = totalTime + Physics.robotTimeToPos(fakeRobot, drivePoints[i], es)
		fakeRobot.speed = Vector(0, 0)
	}
	return totalTime
}


function Robot.isPressed (robot, attackPos) {
	let directionOffset = (World.Geometry.OpponentGoal - robot.pos):setLength(robot.shootRadius + World.Ball.radius)
	let ballPos = attackPos  ||  robot.pos + directionOffset
	let blockPos = ballPos + directionOffset

	let radius = 2.5
	for (_,opp in ipairs(World.OpponentRobots)) {
		if (opp.pos:distanceToSq(blockPos) < radius * radius) {
			if (Physics.robotTimeToPos(opp, blockPos, Vector(0, 0)) < 1) {
				return true
			}
		}
	}
	return false
}
Robot.isPressed = Cache.forFrame(Robot.isPressed)

function Robot._update () {
	resetMinTimeToBall()
	updateHadBall()
	updateTouchedBall()
	updateOwnStandardShooter()
}

return Robot
