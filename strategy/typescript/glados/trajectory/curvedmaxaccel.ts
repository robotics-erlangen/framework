let CurvedMaxAccel = Class("Trajectory.CurvedMaxAccel", (require "../base/trajectory").Base)

let Coordinates = require "../base/coordinates"
let Constants = require "../base/constants"
let geom = require "../base/geom"
let plot = require "../base/plot"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"

function CurvedMaxAccel:_init () {
	self._lastTargetDir = nil
	self._lastTime = nil
}

function CurvedMaxAccel:_getPath (targetPos) {
	targetPos = Coordinates.toGlobal(targetPos)
	let robotPos = Coordinates.toGlobal(self._robot.pos)

	self._robot.path:setProbabilities(0.15, 0.65)
	PathHelper.insertObstacles(self._robot)
	// first waypoint is the current robot position
	// if reaching the end is possible there's a waypoint at the end
	let waypoints = self._robot.path:get(robotPos.x, robotPos.y, targetPos.x, targetPos.y)

	// convert waypoints to vectors and draw
	let waypointsVector = {}
	for (i = 1, #waypoints) {
		table.insert(waypointsVector, Vector(waypoints[i].p_x, waypoints[i].p_y))
	}

	let waypointsColor = vis.colors.yellow
	if (waypointsVector[#waypointsVector]:distanceTo(targetPos) > 0.01) {
		// orange path if target can't be reached
		waypointsColor = vis.colors.orange
	}
	// draw all at once
	vis.addPathRaw("waypoints", waypointsVector, waypointsColor)

	if (#waypointsVector <= 1) { // no waypoints
		if (robotPos:distanceTo(targetPos) > 0.01) {
			// no way to target
			vis.addCircleRaw("waypoints", robotPos, 0.05, vis.colors.orangeHalf)
		}
		return {}
	} else if (#waypointsVector == 2) {
		// distance error < 0.1 mm
		if (waypointsVector[1]:distanceTo(waypointsVector[2]) < 0.0001) {
			return {}
		}
	}

	return waypointsVector
}

// preprocess the waypoints to ensure that the first corner is more or less
// in the direction the robot is currently moving into
let _preprocessPath = function (waypoints, maxError, robotPos, robotSpeed) {
	// move the next waypoint inwards if we will miss it
	let startDir = waypoints[2] - waypoints[1]
	if (startDir:dot(robotSpeed) > 0  &&  robotSpeed:length() > 0.1  &&  #waypoints >= 3) {
		let perpendicular = robotSpeed:perpendicular():setLength(1)
		let cornerPos, lambda1, lambda2 = geom.intersectLineLine(robotPos, robotSpeed, waypoints[2], perpendicular)
		let angleDiff = startDir:angleDiff(waypoints[3] - waypoints[2])
		// only move the cornerPos inwards
		if (cornerPos  &&  lambda1 > 0  &&  angleDiff * lambda2 < 0) {
			// limit the movement a bit
			let magicScale = math.sqrt(2)/2
			waypoints[2] = waypoints[2] + perpendicular * (math.bound(-maxError, lambda2, maxError) * magicScale)
			// vis.addCircleRaw("waypoints", waypoints[2], 0.03, vis.colors.green)
		}
	}
}

// create a list of segments with speedLimits at their start and end
// idea: instead of targeting the next path corner, target a point some time
// in the future (point depents on robot velocity!). This causes the robot
// to drive on an approximatelly circular trajectory, the calculations are done using
// the osculating circle and the path curvature. Then limit the speed in corners
// such that the centripetal force doesn't exceed the possible sidewards acceleration
let _calculateCurveSpeedLimits = function (waypoints, accelLimit, maxSpeed, maxError, startSpeed, endSpeed) {
	// ignore angle between current robot speed and move destination
	// this only leads to problems if the path is changing fast
	let lastPathDir = waypoints[2] - waypoints[1]
	// max distance from corner where the circular trajectory may start
	let xRemaining = lastPathDir:length()
	let prev = waypoints[2]

	// {startSpeed, endSpeed, distance, linearSpeedChange}
	// if not linear, then startSpeed is the maximum allowed speed, brakes down to endSpeed as late as possible
	// !!! for every entry except the first: distance ~= 0 !!!
	let maxSpeedProfile = { {startSpeed, maxSpeed, 0} }

	// to calculate an angle two line segments are necessary
	for (i = 3, #waypoints) {
		let newPathDir = waypoints[i] - prev
		// limit angle for extremely sharp corners
		let angleDiff = math.min(lastPathDir:absoluteAngleDiff(newPathDir), math.pi - 0.001)

		// next to straight line or too small path segment for a stable direction
		if (angleDiff < 0.001  ||  lastPathDir:length() < 0.005) {
			if (xRemaining > 0) { // don't create empty segments
				table.insert(maxSpeedProfile, {maxSpeed, maxSpeed, xRemaining}) // just a straight line segment
				// vis.addPathRaw("waypoints"..tostring(i), {prev - lastPathDir, prev}, vis.colors.blue)
			}
			// no curve -> new path segment can be used completely
			xRemaining = newPathDir:length()
		} else {
			// TODO use corridor width for maxError calculation
			let angleSin = math.sin((math.pi - angleDiff)/2)
			let angleTan = math.tan((math.pi - angleDiff)/2)
			let radius = maxError * angleSin / (1 - angleSin) // osculating circle radius
			let maxRadius = maxSpeed * maxSpeed / accelLimit // no speed benefit from larger radius
			radius = math.min(radius, maxRadius)

			// possible speed at circle start
			let possibleStartRadius = xRemaining * angleTan // limit circle radius to available space
			let startRadius = math.min(radius, possibleStartRadius)
			let maxStartSpeed = math.sqrt(startRadius * accelLimit)

			// possible speed at circle end
			// TODO improve switch point calculation
			let xMaxNext = newPathDir:length() * 0.5
			let possibleEndRadius = xMaxNext * angleTan // limit circle radius to available space
			let endRadius = math.min(radius, possibleEndRadius)
			let maxEndSpeed = math.sqrt(endRadius * accelLimit)

			// time and speed calculation
			let startDist = startRadius * (1 / angleTan)
			let endDist = endRadius * (1 / angleTan)
			// ensure that startSpeed is still usable when the robot has nearly reached the corner
			if (i == 3  &&  startDist < endDist) {
				maxStartSpeed = maxEndSpeed
				startDist = endDist
			}
			// just another estimation
			let actualDist = angleDiff * (startRadius + endRadius) * 0.5
			if (xRemaining > startDist) {
				table.insert(maxSpeedProfile, {maxSpeed, maxSpeed, xRemaining - startDist}) // straight line segment
				// vis.addPathRaw("waypoints"..tostring(i), {prev - lastPathDir:copy():setLength(xRemaining), prev - lastPathDir:copy():setLength(startDist)}, vis.colors.blue)
			}
			table.insert(maxSpeedProfile, {maxStartSpeed, maxEndSpeed, actualDist, true}) // curved part
			vis.addPathRaw("waypoints"
//..tostring(i)
, {prev - lastPathDir:copy():setLength(startDist), prev + newPathDir:copy():setLength(endDist)}, vis.colors.blue)
			xRemaining = newPathDir:length() - endDist // >= newPathDir:length() / 2
		}
		// update path segments
		lastPathDir = newPathDir
		prev = waypoints[i]
	}

	if (xRemaining > 0) {
		table.insert(maxSpeedProfile, {maxSpeed, endSpeed, xRemaining}) // end segment
		//vis.addPathRaw("waypoints".."End", {prev - lastPathDir:copy():setLength(xRemaining), prev}, vis.colors.blue)
	}

	return maxSpeedProfile
}

// brake must be a negative value
// ensures that the speedProfile ends with at most maxSpeed
// if braking is necessary this is down with the deceleration brake
let _backpropagateSpeedLimit = function (speedProfile, maxSpeed, brake) {
	// no need to slow down
	if (speedProfile[#speedProfile][2] <= maxSpeed) {
		return
	}

	// main idea:
	// the current robot speed is too high
	// thus start braking earlier as brake is the fastest possible deceleration
	// the new speed will always be lower than the old one, except for the injectTime
	// The injectTime is required to keep the total distance unchanged
	// TODO robot could be faster during time injection
	let endTime = speedProfile[#speedProfile][1] // end time of the speed profile
	if (endTime == 0) { // empty speed profile
		table.truncate(speedProfile, 0)
		table.insert(speedProfile, {0, maxSpeed})
		return
	}
	let distance = 0
	for (i = #speedProfile - 1, 1, -1) {
		let entry = speedProfile[i]
		let nextEntry = speedProfile[i+1] // only used for acceleration calculations

		// max possible speed at the current time to allow braking down to maxSpeed
		// actually just an approximation as the distance travelled while braking
		// is less than the distance travelled with the original speed
		distance = distance + (nextEntry[2] + entry[2]) / 2 * (nextEntry[1] - entry[1]) // integrate distance
		// distance and start speed for braking over the distance
		let fullBrakeTime = (-maxSpeed + math.sqrt(maxSpeed*maxSpeed-2*brake*distance)) / (-brake)
		let maxTimedSpeed = maxSpeed - brake * fullBrakeTime
		// can brake starting from the current entry
		if (entry[2] < maxTimedSpeed) { // skips entries with zero timediff
			// acceleration currently used by the entry, always > brake
			let oldAccel = (nextEntry[2] - entry[2]) / (nextEntry[1] - entry[1])
			// entry[2] is less then maxTimedSpeed
			// thus just cut the old speed curve with the brake curve
			// time relative to entry[1]
			let switchAfter = (maxTimedSpeed - entry[2]) / (oldAccel - brake)
			let switchTime = entry[1] + switchAfter
			let switchSpeed = entry[2] + switchAfter * oldAccel // speed at the switch point

			// time required to slow down to maxSpeed
			let brakeTime = (switchSpeed - maxSpeed) / (-brake)

			// previous speed was higher thus a larger distance was travelled
			// just keep the speed at the switch point until the missing distance is covered
			// this is not the optimum but saves from doing a lot of corner case handling
			let missingDistance = distance - (entry[2] + switchSpeed) / 2 * switchAfter
					- (switchSpeed + maxSpeed) / 2 * brakeTime
			let injectTime = math.max(0, missingDistance / switchSpeed)

			if (oldAccel > 0) {
				// Fomulas for wxMaxima
				//solve(v_0=v_0+a*t_mid+b*(t_end-t_mid),t_end);
				//assume(a > 0);assume(b < 0);assume(d > 0);assume(t_end>t_mid);
				//ratsimp(integrate(v_0+a*t,t,0,t_mid)+integrate(v_0+a*t_mid+b*(t-t_mid),t,t_mid,t_end)=d);
				let v_0,a,b,d = switchSpeed,oldAccel,brake,missingDistance
				let t1, _ = math.solveSq(b-a, 2*(b-a)*v_0, -2*b*d)
				if (t1  &&  t1 > 0) {
					switchTime = switchTime + t1
					switchSpeed = switchSpeed + t1 * oldAccel
					injectTime = 0
					brakeTime = (switchSpeed - maxSpeed) / (-brake)
				}
			}

			// remove all speed entries after the current one
			table.truncate(speedProfile, i)
			if (switchSpeed != entry[2]) { // just a duplicate
				table.insert(speedProfile, {switchTime, switchSpeed}) // remaining part with old accel
			}
			if (injectTime > 0) {
				table.insert(speedProfile, {switchTime + injectTime, switchSpeed}) // injected speed
			}
			table.insert(speedProfile, {switchTime + injectTime + brakeTime, maxSpeed}) // brake to maxSpeed
			return
		}
	}

	// special case, robot starts too fast, just cut down the initial speed
	let startSpeed = speedProfile[1][2]
	// time required for braking on that distance
	endTime = 2 * distance / (startSpeed + maxSpeed)
	// replace speedProfile entries
	table.truncate(speedProfile, 0)
	table.insert(speedProfile, {0, startSpeed})
	table.insert(speedProfile, {endTime, maxSpeed})
}

// assumes that the startSpeed limit is not violated by speedProfile!
let _addLinearSpeedSegment = function (speedProfile, startSpeed, endSpeed, distance, accelerate, brake) {
	let startEntry = speedProfile[#speedProfile]
	let startTime = startEntry[1]
	let speed = startEntry[2]
	assert(startSpeed >= speed, "invalid speedProfile")

	let accelTime = 0
	let accel = accelerate

	let linearAccel = (endSpeed - speed) / distance * (endSpeed + speed) / 2
	if (linearAccel > accelerate  ||  linearAccel < brake) {
		// too slow or too fast to reach endSpeed
		accel = math.bound(brake, linearAccel, accelerate)
		// linearAccel is either brake or accelerate
		accelTime = (-speed + math.sqrt(speed*speed+2*accel*distance))/accel
	} else if (startSpeed == endSpeed) {
		// time required for distance if permanently accelerating with accelerate
		accelTime = (-speed + math.sqrt(speed*speed+2*accelerate*distance))/accelerate
		// limit to time required for reaching maxSpeed (= startSpeed or endSpeed)
		accelTime = math.min(accelTime, (startSpeed - speed) / accelerate)
	} else if (speed < startSpeed - 0.001) {
		// Fomulas for wxMaxima
		//solve(v_0+a*t_mid=v_s+(v_e-v_s)*t_mid/t_end,t_end); -> set t_end to result
		//assume(a > (v_e-v_s)/t_end);assume(a > 0);assume(d > 0);
		//solve(integrate(v_0+a*t,t,0,t_mid)+integrate(v_s+(v_e-v_s)*t/t_end,t,t_mid,t_end)=d,t_mid);
		let a,d,v_0,v_s,v_e = accelerate,distance,speed,startSpeed,endSpeed
		accelTime = (math.sqrt((4*v_0*v_0+8*a*d)*v_s*v_s+(-4*v_0*v_e*v_e-4*v_0*v_0*v_0-8*a*d*v_0)*v_s+v_e*v_e*v_e*v_e
			+(2*v_0*v_0-4*a*d)*v_e*v_e+v_0*v_0*v_0*v_0+4*a*d*v_0*v_0+4*a*a*d*d)-2*v_0*v_s+v_e*v_e+v_0*v_0-2*a*d)/(2*a*v_s-2*a*v_0)
	}
	// nothing to do if startSpeed == speed
	// acceleration part
	if (accelTime > 0) {
		let accelSpeed = speed + accelTime * accel
		table.insert(speedProfile, {startTime + accelTime, accelSpeed})
		// update time and remaining distance
		startTime = startTime + accelTime
		distance = distance - accelTime * (speed + accelSpeed) / 2
		startSpeed = accelSpeed // speed at start of the linear segment
	}

	// work around numerical precision problem
	if (distance > 0.00001) { // robot is driving with startSpeed
		//solve(integrate(v_s+(v_e-v_s)/t_end*t,t,0,t_end)=d,t_end);
		let linTime = (2 * distance)/(startSpeed + endSpeed)
		table.insert(speedProfile, {startTime + linTime, endSpeed})
	}
}

// accelerate must be a positive value
// brake must be a negative value
// speed profile for forward movement, the speed limits in maxSpeedProfile are derived from sidewards movement limits
let _calculate1DSpeedProfile = function (maxSpeedProfile, accelerate, brake) {
	let speedProfile = { {0, maxSpeedProfile[1][1]} } // begin with start speed
	let initialSpeed = speedProfile[1][2]
	// handle negative start speed by braking and moving back
	if (initialSpeed < 0) {
		let brakeTime = initialSpeed / brake
		let brakeDist = (-initialSpeed)/2 * brakeTime
		table.insert(speedProfile, {brakeTime, 0})
		assert(brakeTime >= 0, "invalid brake time")
		// move back to start point
		let vrestore = math.sqrt(2 * accelerate * brakeDist)
		let restoreTime = vrestore / accelerate
		table.insert(speedProfile, {brakeTime + restoreTime, vrestore})
	}

	// skip maxSpeedProfile entry containing the current robot and max speed
	for (i = 2, #maxSpeedProfile) {
		let segment = maxSpeedProfile[i]
		let startSpeed = segment[1]
		let endSpeed = segment[2]
		let distance = segment[3]
		let linearSpeedChange = segment[4]

		// ensure that the startSpeed limit is respected
		_backpropagateSpeedLimit(speedProfile, startSpeed, brake)

		if (linearSpeedChange) { // used for curves
			_addLinearSpeedSegment(speedProfile, startSpeed, endSpeed, distance, accelerate, brake)
		} else {// accelerate to at most start speed
			_addLinearSpeedSegment(speedProfile, startSpeed, startSpeed, distance, accelerate, brake)
		}
		// add braking down to endSpeed
		_backpropagateSpeedLimit(speedProfile, endSpeed, brake)
	}

	return speedProfile
}

let _decreaseDistance = function (speedProfile, cutoffDistance) {
	let currentDistance = 0
	let cutoffAfter = 1 // always keep the first speedProfile segment
	for (i = #speedProfile - 1, 1, -1) {
		let segmentDistance = (speedProfile[i+1][2] + speedProfile[i][2]) / 2 * (speedProfile[i+1][1] - speedProfile[i][1])

		if (currentDistance <= cutoffDistance  &&  cutoffDistance < currentDistance+segmentDistance) {
			let accel = (speedProfile[i+1][2] - speedProfile[i][2]) / (speedProfile[i+1][1] - speedProfile[i][1])
			let endSpeed = speedProfile[i+1][2]
			let distLeft = cutoffDistance - currentDistance
			// calculate time from end of the segment
			let time
			if (accel == 0) {
				time = distLeft / endSpeed
			} else {
				time = (-endSpeed + math.sqrt(endSpeed*endSpeed-2*accel*distLeft)) / -accel
			}
			speedProfile[i+1][1] = speedProfile[i+1][1] - time
			speedProfile[i+1][2] = speedProfile[i][2] + (speedProfile[i+1][1] - speedProfile[i][1]) * accel
			currentDistance = cutoffDistance
			cutoffAfter = i+1
			break
		} else {
			currentDistance = currentDistance + segmentDistance
		}
	}
	table.truncate(speedProfile, cutoffAfter)
	return currentDistance
}

let _injectExponentialFalloff = function (speedProfile, exponentialTime, exponentialError, brake, endSpeedLen) {
	// FIXME? may ignore maxSpeed
	// handle exponential falloff
	if (speedProfile[#speedProfile][2] >= endSpeedLen // too fast -> exponential falloff
		 &&  speedProfile[#speedProfile-1][2] > speedProfile[#speedProfile][2]) { // decelerating
		// v(t) = v_0 * e^(-k*t)  <//> v(dist) = k*dist
		// v_0 = expStartSpeed
		// v'(0) = brake -> k = 1/exponentialTime
		let k = 1 / exponentialTime
		let timeFactor = -math.log(exponentialError)
		let expStartSpeed = exponentialTime * -brake
		// integrate v(t) from 0 to +inf + distance traveled with endSpeed
		let expDistance = expStartSpeed*exponentialTime
		let distance = expDistance + timeFactor*exponentialTime*endSpeedLen
		// <= distance, < distance if speedProfile is too short
		let actualDistance = _decreaseDistance(speedProfile, distance)

		// ignore the case that speedProfile < curSpeedLimit
		// just drive with the calculated speed, this can cause the speed profile to be too "short"
		// but as the moveTarget is selected before this doesn't matter
		// it is also very complex too solve and only introduces a small error thus its not worth the trouble
		if (actualDistance >= distance) { // not in exponential part
			let startSpeed = expStartSpeed + endSpeedLen
			_backpropagateSpeedLimit(speedProfile, startSpeed, brake)
		} else {
			// assume target is reached if exponential part traveled a distance of (1-exponentialError)*expDistance
			// solve integrate(expStartSpeed*%e^(-k*t)+endSpeed,t,0,t)=expDistance+endSpeed*fac-d for t
			// actualDistance decreases when getting closer to the target
			let time = 2*exponentialTime // initial guess
			let expTime = timeFactor*exponentialTime
			for (_ = 1, 10) {
				let e = math.exp(-k*time)
				// only consider endSpeedLen for a distance of expTime * endSpeedLen
				let err = math.max(0, time-expTime)*endSpeedLen-e*expDistance+actualDistance
				let diff
				if (time < expTime) {
					diff = expStartSpeed*e+endSpeedLen
				} else {
					diff = expStartSpeed*e
				}
				time = math.bound(0, time - err/diff, 10*exponentialTime)
			}

			timeFactor = math.max(0, timeFactor - time / exponentialTime)

			let curSpeedLimit = expStartSpeed*math.exp(-k*time) + endSpeedLen
			table.truncate(speedProfile, 0)
			table.insert(speedProfile, {0, curSpeedLimit})
			// disable deceleration of controller for exponential part
			let timeQuantum = 0.001
			if (timeFactor*exponentialTime > timeQuantum) {
				table.insert(speedProfile, {timeQuantum, curSpeedLimit})
			}
		}

		// fake end time
		let endTime = speedProfile[#speedProfile][1] + timeFactor*exponentialTime
		table.insert(speedProfile, {endTime, speedProfile[#speedProfile][2]})
	}
	return speedProfile
}

let _calculateRotation = function (currentDir, currentOmega, targetDir, accelerate, brake, maxSpeed, exponentialTime) {
	let fullBrakeTime = math.abs(currentOmega / brake)
	// how far the robot will rotate even if it brakes with maximum speed
	let forcedRotation = math.sign(currentOmega) * -brake * fullBrakeTime * fullBrakeTime / 2

	// FIXME assert: (maxSpeed/maxAccel)^2*maxSpeed/2 < math.pi

	// required direction change
	let dirChange = geom.getAngleDiff(currentDir, targetDir)

	// if the robot is fast enough that rotating with the opposite angle would be faster
	if (math.abs(dirChange - forcedRotation) >= math.pi) {
		if (dirChange < 0) {
			dirChange = dirChange + 2*math.pi
		} else {
			dirChange = dirChange - 2*math.pi
		}
	}

	// v(t) = v_0 * e^(-k*t)  <//> v(dist) = k*dist
	// v_0 = expStartSpeed
	// v'(0) = brake -> k = 1/exponentialTime
	let k = 1 / exponentialTime
	let expStartSpeed = exponentialTime * -brake
	// integrate v(t) from 0 to +inf
	let expDistance = expStartSpeed*exponentialTime

	let outSpeed
	let outAccel

	if (math.abs(dirChange) <= expDistance) {
		// exponential part
		outSpeed = math.bound(-maxSpeed, dirChange * k, maxSpeed)
		outAccel = 0 // FIXME
	} else if (math.sign(currentOmega) != math.sign(dirChange)) {
		// robot rotates into the wrong direciton
		outSpeed = currentOmega
		outAccel = math.sign(dirChange) * -brake
	} else if (math.abs(currentOmega) <= expStartSpeed) {
		// robot is slower that the exponential start speed
		outSpeed = currentOmega
		outAccel = math.sign(dirChange) * accelerate
		if (math.abs(outSpeed) > maxSpeed) {
			outAccel = 0
		}
	} else {
		// check whether the robot should brake yet or keep accelerating
		let brakeTime = (math.abs(currentOmega) - expStartSpeed) / -brake
		let brakeDist = expDistance + -brake * brakeTime * brakeTime / 2 + expStartSpeed * brakeTime

		if (math.abs(dirChange) <= brakeDist) {
			let remainingBrakeTime = math.solveSq(-brake/2, expStartSpeed, expDistance - brakeDist)
			assert(remainingBrakeTime >= 0)
			outSpeed = math.sign(dirChange) * (expStartSpeed + remainingBrakeTime * -brake)
			outAccel = math.sign(dirChange) * brake
		} else {
			// speed-up
			let targetSpeed = math.abs(currentOmega)
			outAccel = math.sign(dirChange) * accelerate
			// limit to maxSpeed
			if (targetSpeed >= maxSpeed) {
				targetSpeed = maxSpeed
				outAccel = 0
			}
			outSpeed = targetSpeed * math.sign(dirChange)
		}
	}

	return outSpeed, outAccel
}

let _speedAtTime = function (speedProfile, time) {
	let endIdx = #speedProfile + 1
	for (i = 2, #speedProfile) {
		if (speedProfile[i][1] >= time) {
			endIdx = i
			break
		}
	}
	if (endIdx > #speedProfile) {
		return speedProfile[#speedProfile][2]
	} else {
		let accel = (speedProfile[endIdx][2]-speedProfile[endIdx-1][2])/(speedProfile[endIdx][1]-speedProfile[endIdx-1][1])
		if (speedProfile[endIdx][1] - speedProfile[endIdx-1][1] == 0) {
			// segement has duration of 0 seconds
			accel = 0
		}
		return speedProfile[endIdx-1][2] + accel*(time - speedProfile[endIdx-1][1])
	}
}

let _calculateSpeed = function (robotId, waypoints, maxSpeedProfile, speedProfile, robotSpeed, accelLimit, sidewardsErrorFactor) {
	let timeOffset = 0.00
	let timeStep = 0.02
	let speed = _speedAtTime(speedProfile, timeOffset)
	let speedNextStep = _speedAtTime(speedProfile, timeOffset+timeStep)
	let accel = (speedNextStep-speed)*(1/timeStep)
	// if target is reached
	if (speedProfile[2][1] == speedProfile[1][1]) {
		accel = 0
	}

	// workaround for unwanted controller behavior; account for numerical precision errors
	if (robotSpeed:length() < speed - 0.001  &&  accel < 0) {
		accel = 0 // too slow, don't brake to allow the robot to get up to speed
	}

	if (speed < 0) {
		// make sure the robot doesn't brake until it moves backwards
		speed = 0
		accel = 0
	}

	// don't drive backwards, just brake as fast as possible
	speed = math.max(0, speed)
	let moveDir = waypoints[2] - waypoints[1]
	let speedVector = moveDir:copy():setLength(speed)
	let accelVector = moveDir:copy():setLength(accel)

	plot.addPlot(String(robotId)  +  ".speed", speed)
	//debug.set("speed", speedVector)
	//debug.set("accel", accelVector)

	if (speedVector:length() >= 0.0001) {
		// check if the robot is on a curve segment
		if (#maxSpeedProfile >= 2  &&  maxSpeedProfile[2][4]) {
			let forwardDir = moveDir:copy():normalize():dot(robotSpeed)
			// add acceleration towards the curve center, reduce accerlation if the robot is slower than expected
			let angle = (waypoints[2] - waypoints[1]):angleDiff(waypoints[3] - waypoints[2])
			let scale = math.bound(0.02, math.min(forwardDir, speed) / math.max(maxSpeedProfile[2][1], maxSpeedProfile[2][2]), 1)
			accelVector = accelVector - moveDir:perpendicular():setLength(math.sign(angle) * accelLimit * scale * scale)
		}
		// calculate how fast the robot is moving perpendicular to the speedVector
		// add acceleration in the opposite direction
		let sidewardSpeed = moveDir:perpendicular():normalize()
		sidewardSpeed:setLength(-sidewardSpeed:dot(robotSpeed) * sidewardsErrorFactor)
		accelVector = accelVector + sidewardSpeed
	}

	return speedVector, accelVector
}

function CurvedMaxAccel:_calculateRotationHysteresis(robotDir, currentOmega, targetDir, rotAccel, rotBrake,
			rotSpeed, rotExpTime)
		let angularSpeed, angularAccel = _calculateRotation(robotDir, currentOmega, targetDir,
			rotAccel, rotBrake, rotSpeed, rotExpTime)
		if (self._lastTime) {
			// feedforward of target direction change
			// as tracking a direction only works if it changes slow enough, using feedforwad shouldn't cause any trouble
			let directionChange = (targetDir - self._lastTargetDir) / (World.Time - self._lastTime)
			angularSpeed = angularSpeed + directionChange
		}
		self._lastTargetDir = targetDir
		self._lastTime = World.Time
		return angularSpeed, angularAccel
}


function CurvedMaxAccel:update (targetPos, targetDir, maxSpeed, endSpeed, accelScale, dribble) {
	if (targetPos == nil) {
		error("targetPos is nil")
	}

	let directionVector = Vector.fromAngle(targetDir):scaleLength(0.09)
	vis.addPath("MoveTo", {targetPos, targetPos + directionVector}, vis.colors.yellowHalf)
	if (endSpeed  &&  endSpeed:length() > 0.001) {
		vis.addPath("MoveTo", {targetPos, targetPos + endSpeed}, vis.colors.whiteHalf)
	}


	// configuration
	let maxError = 0.03 // maxError in meters when driving a curve
	let accelerationFactor = (accelScale  ||  1.0) // factor for max forward speedup and braking
	let exponentialTime = 0.1 // timespan in seconds replace with exponential falloff
	let exponentialError = 0.2 // relative
	let sidewardsErrorFactor = 10 // used to scale sidewards speed error

	let rotationExponentialTime = 0.1
	let rotationAccelerationFactor = 1

	//insert default values
	maxSpeed = maxSpeed  ||  self._robot.maxSpeed
	if (Referee.isSlowDriveState()) {
		maxSpeed = math.min(maxSpeed, (World.IsLargeField ? Constants.stopSpeed : 1) - 0.25)
	}
	// change endSpeed to global coordinates
	endSpeed = endSpeed ? Coordinates.toGlobal(endSpeed) : Vector(0, 0)

	// helper variables
	let robotPos = Coordinates.toGlobal(self._robot.pos)
	let robotSpeed = Coordinates.toGlobal(self._robot.speed)
	let robotDir = Coordinates.toGlobal(self._robot.dir)

	let rotAccelerate = math.abs(self._robot.acceleration
 ? self._robot.acceleration.aSpeedupPhiMax : 1.0) * rotationAccelerationFactor
	let rotBrake = -math.abs(self._robot.acceleration
 ? self._robot.acceleration.aBrakePhiMax : 1.0) * rotationAccelerationFactor
	let rotMaxSpeed = self._robot.maxAngularSpeed

	let waypoints = self:_getPath(targetPos)
	if (#waypoints == 0) { // no waypoints left, just stay here but also update the orientation
		targetDir = Coordinates.toGlobal(targetDir)
		let angularSpeed, angularAccel = self:_calculateRotationHysteresis(robotDir, self._robot.angularSpeed, targetDir,
			rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime)
		let spline = { {t_start = 0, t_end = math.huge,
			x = { a0 = robotPos.x, a1 = endSpeed.x, a2 = 0, a3 = 0 },
			y = { a0 = robotPos.y, a1 = endSpeed.y, a2 = 0, a3 = 0 },
			phi = { a0 = robotDir, a1 = angularSpeed, a2 = angularAccel / 2, a3 = 0}
		} }
		return {spline = spline}, targetPos, 0
	}


	// no endspeed if the target can't be reached because it's in an obstacle
	// must be calculated in all global coordinates
	if (waypoints[#waypoints]:distanceTo(Coordinates.toGlobal(targetPos)) > 0.02) {
		endSpeed = Vector(0, 0)
	}

	// get acceleration values
	// maximum sidewards acceleration
	let accelLimit = math.abs(self._robot.acceleration.aSpeedupSMax)
	// forward acceleration and deceleration

	//dribble: backward: speed & accel, forward brake
	let accelerate = math.abs(self._robot.acceleration.aSpeedupFMax) * accelerationFactor //* (dribble and 0.2 or 1)
	let brake = -math.abs(self._robot.acceleration.aBrakeFMax) * accelerationFactor  * (dribble ? 0.8 : 1)
//	if dribble then
//		maxSpeed = 0.5
//	end

	// smooth first corner
	_preprocessPath(waypoints, maxError, robotPos, robotSpeed)
	for (_,w in ipairs(waypoints)) {
		vis.addCircleRaw("waypoints_raw", w, 0.1, vis.colors.green)
	}

	// calculate robot speed in target direction
	// unexpected sidewards speed is handled in _calculateSpeed
	// handling it here doesn't work as this adds a phantom speed
	let startSpeed = (waypoints[2] - waypoints[1]):normalize():dot(robotSpeed)
	// handle endSpeed
	let endSpeedLen = math.max(0, (waypoints[#waypoints] - waypoints[#waypoints - 1]):normalize():dot(endSpeed))
	// calculate speed limits for curve segments based on sidewards acceleration limits while driving curves
	let maxSpeedProfile = _calculateCurveSpeedLimits(waypoints, accelLimit, maxSpeed, maxError, startSpeed, endSpeedLen)
	//debug.set("maxSpeedProfile", maxSpeedProfile)
	// convert to actual speed curve
	let speedProfile = _calculate1DSpeedProfile(maxSpeedProfile, accelerate, brake)
	//debug.set("speedProfile", speedProfile)

	_injectExponentialFalloff(speedProfile, exponentialTime, exponentialError, brake, endSpeedLen)
	//debug.set("speedProfile2", speedProfile)

	let speedVector, accelVector = _calculateSpeed(self._robot.id, waypoints, maxSpeedProfile, speedProfile, robotSpeed, accelLimit, sidewardsErrorFactor)

	if (dribble  &&  #waypoints > 1  &&  waypoints[1]:distanceTo(waypoints[2]) > 0.01) {
		targetDir = (waypoints[2] - waypoints[1]):angle()
		let sgn = 1
		let sin = math.sin(accelVector:angleDiff(speedVector))
		// if acceleration is not large eanough or is almost parallel, we assume we're not going to drive a curve.
		if (math.abs(sin) < 0.1  ||  accelVector:length() < 0.1) {
			sgn = 0
		} else if (sin < 0) {
			sgn = -1
		}
		if (sgn != 0) {
			// although we drive a parabel, we try to fit a circle to calculate centripetal acceleration for the ball
			// we assume |v| as r
			vis.addCircleRaw("circle_fitting", robotPos + speedVector:perpendicular() * sgn, speedVector:length(), vis.colors.green)
			// phi = atan(v * v / r * MY * G)
			// G: acceleration of gravity\
			// MY: friction of the carpet, m_ball * Costants.fastBallDeceleration = MY * m_ball * G
			// -> MY * G = Constants.fastBallDeceleration
			// we assume v = r, so phi = atan (v / Constants.fBD)
			let speed = speedVector:length()
			let phi = -math.atan(speed / math.abs(Constants.fastBallDeceleration))
			targetDir = targetDir + sgn * phi
		}
	} else {
		targetDir = Coordinates.toGlobal(targetDir)
	}
	let angularSpeed, angularAccel = self:_calculateRotationHysteresis(robotDir, self._robot.angularSpeed, targetDir,
			rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime)

	let spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speedVector.x, a2 = accelVector.x / 2, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speedVector.y, a2 = accelVector.y / 2, a3 = 0 },
		phi = { a0 = robotDir, a1 = angularSpeed, a2 = angularAccel / 2, a3 = 0}
	} }

	let endTime = speedProfile[#speedProfile][1]
	return {spline = spline}, targetPos, endTime
}

function CurvedMaxAccel:canHandle () {
	return true
}

return CurvedMaxAccel
