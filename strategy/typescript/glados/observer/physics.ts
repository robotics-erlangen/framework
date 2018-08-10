let Physics = {}

let Cache = require "../base/cache"
let Constants = require "../base/constants"
let Field = require "../base/field"
let geom = require "../base/geom"
let World = require "../base/world"
let Robot // = require "../observer/robot" // cyclic dependency


/// Calculates the parameters for the switch between sliding and rolling
// @param ball Ball - a ball-like structure, must contail the fields pos, speed and maxSpeed
// @return number - the switch time
// @return number - the absolute ball speed at switch time
// @return number - the distance the ball travels until switch time
function Physics.ballSwitchParameters (ball) {
	let a_slide = Constants.fastBallDeceleration
	let a_roll = Constants.ballDeceleration
	let v_max = ball.maxSpeed
	let v_switch = Constants.ballSwitchRatio*v_max
	let v_current = ball.speed:length()
	let t_switch, s_switch
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current)/a_slide
		s_switch = (v_current + 0.5*a_slide*t_switch)*t_switch
	} else {
		t_switch = (v_switch - v_current)/a_roll
		s_switch = (v_current + 0.5*a_roll*t_switch)*t_switch
	}
	return t_switch, v_switch, s_switch
}

/// predicts the ball
// @param ball Ball - a ball-like structure, must contain the fields pos, speed, maxSpeed and radius
// @param time number - the number of seconds from now on
// @return Ball - the predicted ball as a ball-like structure
function Physics.ballAtTime (ball, time) {
	// formulas used:
	// v = a * t + v0
	// t = (v - v0) / a
	// s = 1/2 * a * t^2 + v0 * t + s0

	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration
	let a_roll = Constants.ballDeceleration

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed
	let v_switch = Constants.ballSwitchRatio * v_max
	let v_current = ball.speed:length()

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch
	let s_switch

	// result: the ball-like returned object
	let result = {}

	// since we don't do collision calculation, maxSpeed always stays the same
	result.maxSpeed = ball.maxSpeed
	result.radius = ball.radius

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch

		// if "time" is in the sliding stage
		if (time <= t_switch) {
			let v_result = a_slide * time + v_current
			let s_result = a_slide / 2 * time * time + v_current * time
			result.speed = ball.speed:copy():setLength(v_result)
			result.pos = ball.pos + ball.speed:copy():setLength(s_result)
			return result
		}
	} else {
		t_switch = 0
		s_switch = 0
		v_switch = v_current
	}

	// t_roll: how long the ball stays in the rolling stage
	let t_roll = (0 - v_switch) / a_roll

	// if "time" is after the ball has stopped
	if (time >= t_switch + t_roll) {
		let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
		result.speed = Vector.create(0, 0)
		result.pos = ball.pos + ball.speed:copy():setLength(s_result)
		return result
	}

	// if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch

	let v_result = a_roll * t_roll + v_switch
	let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
	result.speed = ball.speed:copy():setLength(v_result)
	result.pos = ball.pos + ball.speed:copy():setLength(s_result)
	return result
}

/// predicts the ball
// @param ball Ball - a ball-like structure, must contain the fields pos, speed, maxSpeed, posZ, speedZ and radius
// @param time number - the number of seconds from now on
// @return Ball - the predicted ball as a ball-like structure
function Physics.ballAtTimeExperimental (ball, time) {
	// formulas used:
	// v = a * t + v0
	// t = (v - v0) / a
	// s = 1/2 * a * t^2 + v0 * t + s0

	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration
	let a_roll = Constants.ballDeceleration

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed
	let v_switch = Constants.ballSwitchRatio * v_max
	let v_current = ball.speed:length()

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch
	let s_switch

	// result: the ball-like returned object
	let result = {}

	// since we don't do collision calculation, maxSpeed always stays the same
	result.maxSpeed = ball.maxSpeed
	result.radius = ball.radius
	result.pos = ball.pos
	result.posZ = ball.posZ
	result.speed = ball.speed
	result.speedZ = ball.speedZ



	// flying stage
	if (ball.posZ > 0.1) {

		let v0 = ball.speedZ
		let h0 = ball.posZ

		// h(t) = (t^2 / 2) * (-9.81) + t * v0 + h0
		// h(t) == 0; midnight formula
		let impactTime = (-v0 + math.sqrt(v0*v0 + (4 * (-9.81/2) * h0))) / (-9.81)
		let impactSpeed = impactTime * 9.81 - v0
		let timePassed = 0

		while (impactTime < time - timePassed) { // subsequent bouncing
			timePassed = timePassed + impactTime
			v0 = impactSpeed * Constants.floorDamping
			h0 = 0

			let liftTime = v0 / 9.81
			let flightHeight = liftTime*liftTime * (-9.81) / 2 + liftTime * v0
			if (flightHeight < 0.03) { // consider ball rolling
				break
			}

			result.pos = result.pos + ball.speed * impactTime

			impactTime = (-v0 + math.sqrt(v0*v0 + (2 * (-9.81) * h0))) / (-9.81)
			impactSpeed = impactTime * 9.81 - v0
		}

		if (impactTime > time - timePassed) { // flight or bouncing not finished
			let t = time - timePassed
			result.pos = result.pos + ball.speed * t
			result.posZ = h0 + v0*t - 0.5*9.81*t*t
			result.speedZ = v0 - t*9.81
			return result
		}
		time = time - timePassed
	}

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch

		// if "time" is in the sliding stage
		if (time <= t_switch) {
			let v_result = a_slide * time + v_current
			let s_result = a_slide / 2 * time * time + v_current * time
			result.speed = ball.speed:copy():setLength(v_result)
			result.pos = result.pos + ball.speed:copy():setLength(s_result)
			return result
		}
	} else {
		t_switch = 0
		s_switch = 0
		v_switch = v_current
	}

	// t_roll: how long the ball stays in the rolling stage
	let t_roll = (0 - v_switch) / a_roll

	// if "time" is after the ball has stopped
	if (time >= t_switch + t_roll) {
		let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
		result.speed = Vector.create(0, 0)
		result.pos = result.pos + ball.speed:copy():setLength(s_result)
		return result
	}

	// if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch

	let v_result = a_roll * t_roll + v_switch
	let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
	result.speed = ball.speed:copy():setLength(v_result)
	result.pos = result.pos + ball.speed:copy():setLength(s_result)
	return result
}

/// Estimates how long a ball will be flying or subsequently bouncing for a given distance
// @param ball Ball - a ball-like structure
// @param distance number - the distance in meter
// @return Ball, number, number - predicted ball, time, distance left
// The third return value indicates how much distance is left when the ball stopped bouncing
let ballFlightTime = function (ball, distance) {
	let liftTime = ball.initSpeedZ / 9.81
	let timeAlreadyFlying = (ball.initSpeedZ-ball.speedZ) / 9.81
	let flightTime = (2*liftTime) - timeAlreadyFlying
	let flightDist = ball.maxSpeed * flightTime
	let flightDistDone = 0
	let timePassed = 0

	while (flightDist < distance) { // subsequent bouncing
		timePassed = timePassed + flightTime
		ball.initSpeedZ = ball.initSpeedZ * Constants.floorDamping
		liftTime = ball.initSpeedZ / 9.81
		let flightHeight = ball.initSpeedZ*liftTime - (9.81/2)*liftTime*liftTime
		if (flightHeight < 0.03) { // consider ball rolling
			break
		}
		flightTime = 2*liftTime
		flightDistDone = flightDist
		flightDist = flightDist + ball.speed:length() * flightTime
	}

	if (flightDist > distance) { // flight or bouncing not finished
		let t = (distance-flightDistDone) / ball.speed:length()
		ball.pos = ball.pos + ball.speed:copy():setLength(distance)
		ball.posZ = ball.posZ + ball.initSpeedZ*t - 0.5*9.81*t*t
		ball.speedZ = ball.speedZ - t*9.81
		return ball, timePassed, 0
	} else {// ball is rolling
		ball.pos = ball.pos + ball.speed*timePassed
		ball.posZ = 0
		ball.speedZ = 0
		return ball, timePassed, distance-flightDistDone
	}
}


/// predicts how far the ball will travel in the given time
// this is almost the same as Physics.ballAtTime, but it's a bit faster as it doesn't have to care about vectors and end speed
// @param ball Ball - a ball-like structure, must contain the fields pos, speed, maxSpeed and radius
// @param time number - the number of seconds from now on
// @return number - the predicted ball travel distance
function Physics.ballTravelledDistance (ball, time) {
	// formulas used:
	// v = a * t + v0
	// t = (v - v0) / a
	// s = 1/2 * a * t^2 + v0 * t + s0

	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration
	let a_roll = Constants.ballDeceleration

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed
	let v_switch = Constants.ballSwitchRatio * v_max
	let v_current = ball.speed:length()

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch
	let s_switch

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch

		// if "time" is in the sliding stage
		if (time <= t_switch) {
			return a_slide / 2 * time * time + v_current * time
		}
	} else {
		t_switch = 0
		s_switch = 0
		v_switch = v_current
	}

	// t_roll: how long the ball stays in the rolling stage
	let t_roll = (0 - v_switch) / a_roll

	// if "time" is after the ball has stopped
	if (time >= t_switch + t_roll) {
		return a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
	}

	// if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch

	return a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
}

function Physics.calculateChipSpeed (dist) {
	// this flightDistance can be further investigated
	// also, a spinning ball could be considered
	let flightDistance = Constants.floorDamping * dist

	// flight time t = 2 * vz/g => v = (t*g) / 2  (1)
	// t = distance / vground                     (2)
	// assume 45 degree chip angle => vz = vground
	// (2) in (1): v = sqrt(distance*g / 2)
	return math.sqrt((flightDistance*9.81) / 2)
}

function Physics.robotBrakePos (robot) {
	let BREAK_DEFAULT = 5 // rather overestimate than underestimte the opponent
	let brkAcc = robot.acceleration ? robot.acceleration.aBrakeFMax : BREAK_DEFAULT
	let robotSpeed = robot.speed:length()
	let brkLength = 0.5 * robotSpeed * robotSpeed / brkAcc
	return robot.pos + robot.speed:copy():normalize():scaleLength(brkLength)
}

/// estimates the time the ball needs to travel for a chip pass from startPos to endPos
function Physics.chipPassTime (startPos, endPos) {
	let dist = endPos:distanceTo(startPos)
	let zSpeed = Physics.calculateChipSpeed(dist)
	let ball = {
		posZ = 0,
		initSpeedZ = zSpeed,
		speedZ = zSpeed,
		pos = startPos,
		// assume 45 degree chip angle => xySpeed = zSpeed
		speed = (endPos - startPos):setLength(zSpeed),
		maxSpeed = zSpeed
	}
	return Physics.ballTravelTime(ball, dist)
}

/// estimates the time the ball needs to travel a given distance
// @param ball Ball - a ball-like structure
// @param distance number - the distance in meter
// @return number - the estimated time
function Physics.ballTravelTime (ball, distance) {
	if (ball.posZ > 0  ||  ball.initSpeedZ > 0) { // ball is flying
		let newBall, time, restDist = ballFlightTime(ball, distance)
		if (restDist) { // bouncing over
			return time + Physics.ballRollTime(newBall, restDist)
		} else {// ball still in the air or bouncing
			return time
		}
	} else {
		return Physics.ballRollTime(ball, distance)
	}
}

/// estimates the time the ball needs to travel to a given position
// checks if the position lies in front of the ball +- 90 degrees
// if the pos is behind the ball, negative infinity is returned
function Physics.checkedBallTravelTime (ball, pos) {
	let toPos = pos - ball.pos
	if (ball.speed:dot(toPos) > 0) {
		let distance = ball.pos:distanceTo(pos)
		return Physics.ballTravelTime(ball, distance)
	}
	return -math.huge
}


/// estimates the time the ball needs to travel a given distance on the floor
// the estimation does not exceed ballStopTime() unless the distance is too large, then it returns math.huge
// @param ball Ball - a ball-like structure
// @param distance number - the distance in meter
// @return number - the estimated time
function Physics.ballRollTime (ball, distance) {
	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration
	let a_roll = Constants.ballDeceleration

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed
	let v_switch = Constants.ballSwitchRatio * v_max
	let v_current = ball.speed:length()

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch
	let s_switch

	let epsilon = 0.000001

	// ensure that the distance parameter is positive
	if (distance <= epsilon) {
		return 0
	}

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch

		if (distance < s_switch) {
			// a_slide/2 * t^2 + v_current * t - distance = 0
			let t_result = math.solveSq(a_slide / 2, v_current, -distance + epsilon);
			return t_result
		}
	} else {
		t_switch = 0
		s_switch = 0
		v_switch = v_current
	}

	let s_roll = distance - s_switch
	// a_roll/2 * t^2 + v_switch * t - s_roll = 0
	let t_roll = math.solveSq(a_roll / 2, v_switch, -s_roll + epsilon)  ||  math.huge

	let t_result = t_switch + t_roll
	return t_result
}

/// estimates the time the ball needs to travel to a given position
// checks if the position lies in front of the ball +- 90 degrees
// if the pos is behind the ball, negative infinity is returned
function Physics.checkedBallRollTime (ball, pos) {
	let toPos = pos - ball.pos
	if (ball.speed:dot(toPos) > 0) {
		let distance = ball.pos:distanceTo(pos)
		return Physics.ballRollTime(ball, distance)
	}
	return -math.huge
}


/// calculates the time the ball needs to fully stop
// @param ball Ball - a ball-like structure
// @return number - the estimated stop time
function Physics.ballStopTime (ball) {
	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration
	let a_roll = Constants.ballDeceleration

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed
	let v_switch = Constants.ballSwitchRatio * v_max
	let v_current = ball.speed:length()

	let t_slide = 0
	let v_roll = v_current
	if (v_current > v_switch) {
		t_slide = (v_switch - v_current) / a_slide
		v_roll = v_switch
	}

	let t_roll = (0 - v_roll) / a_roll

	return t_slide + t_roll
}

/// calculates the time the ball needs to cross the field border
// @param ball Ball - a ball-like structure
// @param [offset number - additional offset to move field lines further outwards]
// @return number - the estimated out time
function Physics.ballOutTime (ball, offset) {
	if (ball.speed:length() < 0.01) {
		return math.huge
	}
	let lineCut = Field.nextLineCut(ball.pos, ball.speed, offset)
	let distToLine = ball.pos:distanceTo(lineCut)
	return Physics.ballRollTime(ball, distToLine)
}
Physics.ballOutTime = Cache.forFrame(Physics.ballOutTime)


/// first position where the ball will hit the ground again
// @param ball Ball - a ball-like structure
// @return Vector - the estimated landing position
function Physics.ballLandPos (ball) {
	let topHeight = math.max(0, ball.posZ + ball.speedZ * ball.speedZ / (2 * 9.81))
	let timeToTop = ball.speedZ / 9.81
	let timeToFloor = math.sqrt(2 * topHeight / 9.81)

	let remainingFlightTime = math.max(0, timeToTop + timeToFloor)
	return ball.pos + ball.speed * remainingFlightTime
}


// assumes that the path is a direct line from robot.pos to endPos
function Physics.robotTimeToPos (robot, endPos, endSpeedVector) { //, debugFlag)
	// acceleration parameters
	let hardBrakeAccel = 4.7
	let brakeAccelFactor = 1
	let speedupAccelFactor = 1

	// corridor width
	let maxError = 0.001

	// retrieve parameters given via the robot object
	let startPos = robot.pos
	let startSpeed = robot.speed
	let maxSpeed = robot.maxSpeed
	let accelerationProfile = robot.acceleration

	// ignore direction of endSpeed
	let endSpeed = endSpeedVector:length()

	// retrieve acceleration values
	let brakeAccel = accelerationProfile.aBrakeFMax * brakeAccelFactor
	let speedupAccel = accelerationProfile.aSpeedupFMax * speedupAccelFactor

	// init current state
	let currentTime = 0
	let currentSpeed = startSpeed:length()
	let currentPos = startPos

	if (startPos == endPos  &&  currentSpeed <= endSpeed) {
		return 0, 0
	}

	// given currentSpeed, currentPos, endPos and corridorWidth calculate a curve.
	// the curve has to stay in the corridor, while being as fast as possible.
	let rawAngleDiff = (endPos - startPos):absoluteAngleDiff(startSpeed)
	let absAngleDiff = math.min(math.abs(rawAngleDiff), math.pi - 0.001)

	// Let ABCM be the quadrilateral where A is the point where the robot is
	// B the hypothetical point where we stop and change direction,
	// C the point where we start to drive straight again,
	// M the center of the circlesegment AC.
	// We want to know the radius for the curve, that is length([AM]).

	// Angle MAB and angle BCM are pi/2, because BC and AB are tangents to the circle.
	// Triangle AMC is isosceles, because length([AM]) = length([MC]) = radius r.
	// These two facts make sure that Angle MBC = Angle ABM and therefore both of them are 1/2 * Angle ABC = (pi - absAngleDiff)/2
	// Now look at triangle ABM: Angle MAB is pi/2, Angle ABM is known too. length([BM]) = e + length(AM), where e is corridorWidth / 2

	// sin(Angle ABM) * length([BM]) = length([AM]) <=> sin(Angle ABM) * (e+r) = r <=> sin(ABM) * e + sin(ABM) * r = r
	// <=> sin(ABM) * e = r - sin(ABM) r <=> sin(ABM) * e = r (1-sin(ABM)) <=> sin(ABM) * e / (1-sin(ABM)) = r
	let angleSin = math.sin((math.pi - absAngleDiff)/2)
	let radius = maxError * angleSin / (1 - angleSin) * 0.5


	let maxCurveSpeed = math.sqrt(hardBrakeAccel * radius)
	if (maxCurveSpeed > currentSpeed) {
		radius = currentSpeed * currentSpeed / hardBrakeAccel
		maxCurveSpeed = currentSpeed
	}

	// check if brake and return is necessary (BAT)
	if (endSpeed < currentSpeed) {
		let BATspeedDiff = currentSpeed - endSpeed
		let BATtime = BATspeedDiff / hardBrakeAccel
		let BATdist = 0.5 * hardBrakeAccel * BATtime * BATtime + endSpeed * BATtime
		if (BATdist > endPos:distanceTo(startPos)) {
			radius = 0
			maxCurveSpeed = 0.001
		}
	}

	// TODO: model system delay
	// local reactionTime = 0
	// local reactionDist = reactionTime * currentSpeed
	// local reactionPathVec = startSpeed:copy():setLength(reactionDist)
	// currentTime = currentTime + reactionTime
	// currentPos = currentPos + reactionPathVec

	maxCurveSpeed = math.min(maxCurveSpeed, currentSpeed)

	// we need to brake down to maxCurveSpeed
	if (currentSpeed > maxCurveSpeed) {
		let brakeTime = (currentSpeed - maxCurveSpeed) / hardBrakeAccel
		let brakeDist = 0.5 * hardBrakeAccel * brakeTime * brakeTime + maxCurveSpeed * brakeTime
		let linearPathVec = startSpeed:copy():setLength(brakeDist)

		let curveDist = absAngleDiff * radius
		let curveTime = curveDist / maxCurveSpeed

		currentTime = brakeTime + curveTime
		currentSpeed = maxCurveSpeed


		let curvePathVec = Vector(math.sin(rawAngleDiff), math.cos(rawAngleDiff) - 1) * radius
		curvePathVec:rotate(startSpeed:angle())
		currentPos = currentPos + linearPathVec + curvePathVec
	}

	// the remaining trajectory is a simple 1D line
	let remainingDist = currentPos:distanceTo(endPos)
	let expBrakeExtraTime = 0.04

	let linearAccelTime = (maxSpeed - currentSpeed) / speedupAccel
	let linearBrakeTime = (maxSpeed - endSpeed) / brakeAccel
	let linearAccelDist = 0.5 * speedupAccel * linearAccelTime * linearAccelTime + currentSpeed * linearAccelTime
	let linearBrakeDist = 0.5 * brakeAccel * linearBrakeTime * linearBrakeTime + endSpeed * linearBrakeTime

	// case 1: robot reaches maxSpeed
	let maxSpeedDist = remainingDist - linearAccelDist - linearBrakeDist
	if (maxSpeedDist >= 0) {
		let maxSpeedTime = maxSpeedDist / maxSpeed
		return currentTime + linearAccelTime + maxSpeedTime + linearBrakeTime + expBrakeExtraTime, currentTime
	}

	// case 2: robot has to brake immediately
	if (currentSpeed > endSpeed) {
		let slowBrakeTime = (currentSpeed - endSpeed) / brakeAccel
		let slowBrakeDist = 0.5 * brakeAccel * slowBrakeTime * slowBrakeTime + endSpeed * slowBrakeTime
		if (slowBrakeDist > remainingDist) {
			let speedDiff = endSpeed - currentSpeed
			let immediateBrakeAccel = (0.5 * speedDiff * speedDiff + currentSpeed * speedDiff) / remainingDist
			let immediateBrakeTime = speedDiff / immediateBrakeAccel
			return currentTime + immediateBrakeTime + expBrakeExtraTime, currentTime
		}
	}

	// case 3: robot cannot even reach endSpeed
	if (currentSpeed < endSpeed) {
		let slowAccelTime = (endSpeed - currentSpeed) / speedupAccel
		let slowAccelDist = 0.5 * speedupAccel * slowAccelTime * slowAccelTime + currentSpeed * slowAccelTime
		if (slowAccelDist > remainingDist) {
			let accelTime = (-currentSpeed + math.sqrt(currentSpeed * currentSpeed + 2 * speedupAccel * remainingDist)) / speedupAccel
			return currentTime + accelTime, currentTime
		}
	}

	// case 4: robot does not reach maxSpeed
	let speedDiff, accelDiff, minSpeed, plateauSpeed
	if (endSpeed < currentSpeed) {
		speedDiff = currentSpeed - endSpeed
		accelDiff = brakeAccel
		minSpeed = endSpeed
		plateauSpeed = currentSpeed
	} else {
		speedDiff = endSpeed - currentSpeed
		accelDiff = speedupAccel
		minSpeed = currentSpeed
		plateauSpeed = endSpeed
	}
	let timeDiff = speedDiff / accelDiff
	let distDiff = 0.5 * accelDiff * timeDiff * timeDiff + minSpeed * timeDiff
	let distSym = math.max(0, remainingDist - distDiff)

	let A = 0.5 * speedupAccel * brakeAccel / (speedupAccel + brakeAccel)
	let B = plateauSpeed
	let C = -distSym
	let timeSym = math.solveSq(A, B, C)

	return currentTime + timeDiff + timeSym + expBrakeExtraTime, currentTime
}

/// approximates the time the given robot needs to pos for a given endSpeed
// uses a bang-bang motion profile
// calculations are done in 1D (along the line from robot.pos to pos)
// @param robot Robot
// @param pos Vector - the destination
// @param endSpeed Vector - the maximal velocity the robot is allowed to have in the given direction
// @param brakeAndReturn - setting this to true, the robot will brake to stop and return to pos, if it would be faster than endSpeed.
// Warning! This can cause severe numerical instabilities if endSpeed points from robot.pos to pos and the robot is a bit too fast
// Then the robot must do a full stop and return to pos with zero endSpeed!
// @param lowAccel - assume reduced acceleration
// @return number - the estimated time
function Physics.robotTimeToPosOLD (robot, pos, endSpeed, brakeAndReturn, lowAccel) {
	let accelerationFactor = lowAccel ? 0.7 : 0.7 // factor for max forward speedup and braking
	let tolerance = 0.01 // cutoff low distances to prevent instabilities
	// forward acceleration and deceleration
	let accelerate = math.abs(robot.acceleration
 ? robot.acceleration.aSpeedupFMax : 1.0) * accelerationFactor
	let brake = math.abs(robot.acceleration
 ? robot.acceleration.aBrakeFMax : 1.0) * accelerationFactor

	let lineDist = math.max(pos:distanceTo(robot.pos) - tolerance, 0)
	let lineDir = (pos - robot.pos):normalize()
	let robotSpeed = math.min(lineDir:dot(robot.speed), robot.maxSpeed)
	let destSpeed = math.min(math.max(0, lineDir:dot(endSpeed)), robot.maxSpeed)

	let accelTime = (robot.maxSpeed - robotSpeed) / accelerate
	let brakeTime = (robot.maxSpeed - destSpeed) / brake

	let accelDist = robotSpeed * accelTime + accelerate * accelTime * accelTime / 2
	let brakeDist = destSpeed * brakeTime + brake * brakeTime * brakeTime / 2

	let remainingDist = lineDist - accelDist - brakeDist
	if (remainingDist >= 0) {
		// robot reaches full speed
		let maxSpeedTime = remainingDist / robot.maxSpeed
		return accelTime + maxSpeedTime + brakeTime
	} else {
		if (destSpeed >= robotSpeed) {
			let minAccelTime = (destSpeed - robotSpeed) / accelerate
			let minAccelDist = robotSpeed * minAccelTime + accelerate * minAccelTime * minAccelTime / 2
			if (minAccelDist >= lineDist) {
				// won't be able to reach endSpeed
				return (-robotSpeed + math.sqrt(robotSpeed*robotSpeed+2*accelerate*lineDist)) / accelerate
			}
		} else if (destSpeed <= robotSpeed) {
			let minBrakeTime = (robotSpeed - destSpeed) / brake
			let minBrakeDist = destSpeed * minBrakeTime + brake * minBrakeTime * minBrakeTime / 2
			if (minBrakeDist >= lineDist) {
				if (not brakeAndReturn) {
					// won't be able to brake down to endSpeed
					return (-robotSpeed + math.sqrt(robotSpeed*robotSpeed-2*brake*lineDist)) / (-brake)
				}

				// create a fake robot at the position where the robot is able to brake
				let fakeRobot = {
					acceleration = robot.acceleration,
					pos = robot.pos + lineDir * minBrakeDist,
					maxSpeed = robot.maxSpeed,
					speed = Vector(0, 0)
				}
				return minBrakeTime + Physics.robotTimeToPos(fakeRobot, pos, endSpeed)
			}
		}

		// braking start before reaching full speed
		// symmetrically cut speed from maxspeed to lower speeds
		// d = v_max - v_cut
		// v_max(d/accel + d/brake)-accel/2*(d/accel)^2-brake/2*(d/brake)^2=-remaining
		// solve: d^2 * (-1/(2*accel)-1/(2*brake)) + d * v_max * (1/accel + 1/brake) + remaining = 0
		let v_delta = math.solveSq(-0.5*(1/accelerate+1/brake),
				robot.maxSpeed*(1/accelerate+1/brake), remainingDist)
		if (not v_delta) {
			// b^2 - 4*a*c < 0 -> rounding error
			v_delta = robot.maxSpeed
		}
		accelTime = (robot.maxSpeed - v_delta - robotSpeed) / accelerate
		brakeTime = (robot.maxSpeed - v_delta - destSpeed) / brake
		return accelTime + brakeTime
	}
}


/// calculates the min endspeed for the robot to reach pos in the given time
// @param robot Robot
// @param pos Vector
// @param time number
// @return Vector - the endspeed vector (in the direction from robot to pos)
function Physics.robotMinEndspeed (robot, pos, time) {
	let direction = (pos - robot.pos):normalize()
	let maxSpeed = robot.maxSpeed

	// as slow as possible
	let minTime = Physics.robotTimeToPos(robot, pos, Vector(0, 0))
	if (minTime < time) {
		// the robot has more than enough time
		return Vector(0, 0)
	}

	// as fast as possible
	let maxTime = Physics.robotTimeToPos(robot, pos, direction * maxSpeed)
	if (maxTime > time) {
		// the robot cannot make it in time
		return direction * maxSpeed
	}

	// binary search
	// resolution
	let epsilon_v = 0.05

	let v = maxSpeed / 2
	let delta_v = maxSpeed / 4

	while (delta_v > epsilon_v) {
		let t = Physics.robotTimeToPos(robot, pos, direction * v)
		if (t < time) {
			v = v - delta_v
		} else {
			v = v + delta_v
		}
		delta_v = delta_v / 2
	}

	return direction * v
}


/// calculates the time the robot needs to move to the position next to the ball at given t_ball
function Physics.robotTimeForBallTime (robot, ball, targetPos, endSpeedLength, t_ball) {
	let x_ball = Physics.ballAtTime(ball, t_ball).pos
	let axis = (x_ball - targetPos):normalize()
	let offset = axis * (ball.radius + robot.shootRadius)
	let x_robot = x_ball + offset

	// anywhere on the dribbler is okay, not only the center
	let dribblerHalf = axis:perpendicular():scaleLength(-robot.dribblerWidth / 2)
	x_robot = robot.pos:nearestPosOnLine(x_robot + dribblerHalf, x_robot - dribblerHalf)

	// calculate and save the robot time
	let endSpeed = (x_robot - robot.pos):setLength(endSpeedLength)
	return Physics.robotTimeToPos(robot, x_robot, endSpeed)
}

let dist = function (v0, v1, a) {
	let t = math.abs(v0 - v1) / a
	return (v0 + v1) * t / 2, t
}

let angleForTime = function (accA, accB, time, startSpeed) {
	// y1 = t * accA + startSpeed
	// y2 = (t - time) * -accB + endSpeed

	let t = (time * accB - startSpeed) / (accA + accB)
	let maxSpeed = t * accA + startSpeed

	return dist(startSpeed, maxSpeed, accA) + dist(maxSpeed, 0, accB)
}


// calculates the degrees that a robot can turn in a given timespan
// @param robot Robot
// @param time Number - how much time (in seconds) the robot has to turn
// @return dist1 Number - the angle the robot can turn clockwise
// @return dist2 Number - the angle the robot can turn counter-clockwise
function Physics.robotRotationRangeForTime (robot, time) {
	let angularSpeed = robot.angularSpeed
	let maxAccel = robot.acceleration.aSpeedupPhiMax
	let maxDecel = robot.acceleration.aBrakePhiMax
	let extraDist, brakeTime = dist(angularSpeed, 0, maxDecel)

	let dist1 = angleForTime(maxAccel, maxDecel, time, math.abs(angularSpeed))
	let dist2
	if (brakeTime < time) {
		dist2 = angleForTime(maxAccel, maxDecel, time - brakeTime, 0) - extraDist
	} else {
		let minEndSpeed = math.abs(angularSpeed) - time*maxDecel
		dist2 = -dist(math.abs(angularSpeed), minEndSpeed, maxDecel)
	}

	if (angularSpeed < 0) {
		return dist1, dist2
	} else {
		return dist2, dist1
	}
}

let rttbSpecialCases = function (robot, ball, targetPos, endSpeedLength, t_max, t_out) {
	// calculate time required when the robot is directly hit by the ball
	let frontOffset = (targetPos - robot.pos):setLength(ball.radius + robot.shootRadius)
	let ballHitPos, _, lambda = geom.intersectLineLine(ball.pos, ball.speed,
			robot.pos + frontOffset, ball.speed:perpendicular():normalize())
	let ballTimeToHitPos = Physics.ballRollTime(ball, ball.pos:distanceTo(ballHitPos))
	let robotTimeToHitPos = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, ballTimeToHitPos)

	// catch ball at nearest point on ball move line, if that's possible
	// this stabilizes the calculation if the ball is going to hit the robot soon
	// !!! optimistic: assumes that the robot can't be too fast to catch the ball
	if (robotTimeToHitPos <= ballTimeToHitPos) {
		t_max = math.min(ballTimeToHitPos, t_max)
	}

	// Special case: Ball seems to be a bit inside the robot
	// This happens because the tracking doesn't implement a ball collision modell
	if (Robot == nil) {
		Robot = require "observer/robot"
	}
	let relpos = (ball.pos - robot.pos):rotate(-robot.dir)
	relpos.x = relpos.x - robot.shootRadius - ball.radius
	let sidewardsOffset = math.abs(relpos.y)
	if (Robot.touchedBall(robot, 0.15)  &&  relpos.x > -0.25  &&  relpos.x <= 0.05  &&  sidewardsOffset < 0.2) {
		return nil, 0
	}

	// special case: when the ball is fast and will soon hit the dribbler
	// just use the ballTimeToHitPos. This is necessary as the timespan during which
	// the t_ball > t_robot is getting smaller and smaller the distance between ball and robot gets
	// In the end the sampling is no longer able to find a valid time
	// The instability is increased as predicting the fasted position
	// where to catch the ball on the dribber gets more important.
	if (math.abs(lambda) < robot.dribblerWidth/2+0.01  &&  ballTimeToHitPos < 0.25
			 &&  ball.speed:dot(ballHitPos - ball.pos) > 0) {
		if (ballTimeToHitPos <= t_max) {
			return nil, ballTimeToHitPos
		} else {
			return nil, math.huge
		}
	}

	// ball moves away from the robot
	if (t_out < math.huge  &&  ball.speed:dot(ball.pos - robot.pos) > 0) {
		// try to catch the ball inside the field
		let robotTimeToBorder = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_out)
		if (robotTimeToBorder > t_out) {
			return nil, math.huge
		}
	}

	return t_max
}

let rttbQuadraticSampling = function (robot, ball, targetPos, endSpeedLength, t_max, t_stop, t_out) {
	let N_SAMPLES = 10

	let robot_times = {}
	let ball_times = {}

	for (i = 1, N_SAMPLES) {
		// calculate interval
		let i_normalized = (i-1) / (N_SAMPLES-1)
		let step_quadratic = 0.5 * i_normalized * i_normalized + 0.5 * i_normalized
		let t_ball = step_quadratic * t_max
		let t_robot = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball)
		table.insert(ball_times, t_ball)
		table.insert(robot_times, t_robot)
	}

	// the curve of (t_robot - t_ball) has up to 2 maxima
	// the first one occurs at the point where the robot actively catches the ball
	// the second one is the point where the robot moves to the slow or resting ball
	// check if the first maximum is > 0 (if it exists)
	let t_ball_bsearch_start = nil
	let t_ball_bsearch_end = nil
	for (i = 2, N_SAMPLES) {
		// search the first zero crossing
		let timediff0 = ball_times[i-1] - robot_times[i-1]
		let timediff1 = ball_times[i] - robot_times[i]
		if (timediff0 <= 0  &&  timediff1 >= 0) {
			t_ball_bsearch_start = ball_times[i-1]
			t_ball_bsearch_end = ball_times[i]
			break
		}
	}

	// if the robot is always slower than the ball
	// either return the time to the stationary ball
	// or if the ball is too fast, the robot cannot catch it at all
	if (not t_ball_bsearch_start) {
		if (t_stop < t_out) {
			return nil, robot_times[N_SAMPLES]
		} else {
			return nil, math.huge
		}
	}
	return t_ball_bsearch_start, t_ball_bsearch_}
}

let function rttbBinarySearch(robot, ball, targetPos, endSpeedLength,
		t_ball_bsearch_start, t_ball_bsearch_end)
	assert(t_ball_bsearch_start >= 0)
	assert(t_ball_bsearch_end >= t_ball_bsearch_start)
	// time resolution, for a ball with 5m/s, the error may be up to 1 cm
	let epsilon_t = 0.002

	// initialize binary search variables
	let delta_t = (t_ball_bsearch_end - t_ball_bsearch_start) / 4
	let t_ball = t_ball_bsearch_start + delta_t * 2

	// search for optimal time
	while (delta_t > epsilon_t) {
		let t_robot = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball)

		// update search interval
		if (t_robot > t_ball) {
			t_ball = t_ball + delta_t
		} else {
			t_ball = t_ball - delta_t
		}
		delta_t = delta_t / 2
	}
	return t_ball
}


/// calculates the time the robot takes to reach the ball (in a controlled fashion)
// @param robot Robot - the robot
// @param ball Ball - a ball-like structure
// @param targetPos - the position the robot will look at
// @param endSpeedLength - the maximal velocity of the robot when reaching the destination
// @param lastTime - last result of robotTimeToBall for the given parameters
// @return number - the estimated time
function Physics.robotTimeToBall (robot, ball, targetPos, endSpeedLength, lastTime) {
	//local time0 = amun.getCurrentTime()
	// if the ball is extremely slow, consider it as stationary
	if (ball.speed:length() < 0.01) {
		let result = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, 0)
		//local time1 = amun.getCurrentTime()
		//plot.aggregate("robotTimeToBall", time1 - time0)
		return result
	}

	// calculate the time the ball needs to cross the field border
	let t_out = Physics.ballOutTime(ball)
	// calculate the time until the ball stops
	let t_stop = Physics.ballStopTime(ball)
	// upper bound for sampling and binary search
	let t_max = math.min(t_out, t_stop)

	let specialCaseResult
	t_max, specialCaseResult = rttbSpecialCases(robot, ball, targetPos, endSpeedLength, t_max, t_out)
	if (specialCaseResult) {
		//local time1 = amun.getCurrentTime()
		//plot.aggregate("robotTimeToBall", time1 - time0)
		return specialCaseResult
	}

	let t_ball_bsearch_start, t_ball_bsearch_}
	if (lastTime  &&  lastTime < math.huge  &&  lastTime > 0) {
		// try to reuse the sample from last frame
		let t_ball1 = math.max(0, lastTime-World.TimeDiff-0.035)
		let t_diff1 = t_ball1 - Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball1)
		let t_ball2 = lastTime
		let t_diff2 = t_ball2 - Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball2)

		if (t_diff1 <= 0  &&  t_diff2 >= 0) {
			t_ball_bsearch_start = t_ball1
			t_ball_bsearch_end = t_ball2
		} else if (t_diff1 >= 0) {
			t_ball_bsearch_start = 0
			t_ball_bsearch_end = t_ball1
		}
	}

	if (not t_ball_bsearch_start) {
		t_ball_bsearch_start, t_ball_bsearch_}
				= rttbQuadraticSampling(robot, ball, targetPos, endSpeedLength, t_max, t_stop, t_out)

		if (not t_ball_bsearch_start) {
			//local time1 = amun.getCurrentTime()
			//plot.aggregate("robotTimeToBall", time1 - time0)
			return t_ball_bsearch_}
		}
	}

	let t_ball = rttbBinarySearch(robot, ball, targetPos, endSpeedLength,
			t_ball_bsearch_start, t_ball_bsearch_end)
	//local time1 = amun.getCurrentTime()
	//plot.aggregate("robotTimeToBall", time1 - time0)
	return t_ball
}

return Physics
