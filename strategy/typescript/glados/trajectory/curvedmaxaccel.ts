import { log } from "base/amun";
import * as Constants from "base/constants";
import { Coordinates } from "base/coordinates";
import * as debug from "base/debug";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as plot from "base/plot";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { TrajectoryHandler, TrajectoryResult } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { DirectRotation } from "glados/trajectory/directrotation";
import * as PathHelper from "glados/trajectory/pathhelper";

// preprocess the waypoints to ensure that the first corner is more or less
// in the direction the robot is currently moving into
function _preprocessPath(waypoints: Position[], maxError: number, robotPos: Position, robotSpeed: Speed) {
	// move the next waypoint inwards if we will miss it
	let startDir = waypoints[1] - waypoints[0];
	if (startDir.dot(robotSpeed) > 0 && robotSpeed.length() > 0.1 && waypoints.length >= 3) {
		let perpendicular = robotSpeed.perpendicular().normalized();
		let [cornerPos, lambda1, lambda2] = geom.intersectLineLine(robotPos, robotSpeed, waypoints[1], perpendicular);
		let angleDiff = startDir.angleDiff(waypoints[2] - waypoints[0]);
		// only move the cornerPos inwards
		if (cornerPos && lambda1! > 0 && angleDiff * lambda2! < 0) {
			// limit the movement a bit
			let magicScale = Math.sqrt(2) / 2;
			waypoints[1] = waypoints[1] + perpendicular * (MathUtil.bound(-maxError, lambda2!, maxError) * magicScale);
			// vis.addCircleRaw("waypoints", waypoints[1], 0.03, vis.colors.green)
		}
	}
}

// create a list of segments with speedLimits at their start and end
// idea. instead of targeting the next path corner, target a point some time
// in the future (point depents on robot velocity!). This causes the robot
// to drive on an approximatelly circular trajectory, the calculations are done using
// the osculating circle and the path curvature. Then limit the speed in corners
// such that the centripetal force doesn't exceed the possible sidewards acceleration
function _calculateCurveSpeedLimits(waypoints: Position[], accelLimit: number, maxSpeed: number,
		maxError: number, startSpeed: number, endSpeed: number): [number, number, number, boolean?][] {
	// ignore angle between current robot speed and move destination
	// this only leads to problems if the path is changing fast
	let lastPathDir = waypoints[1] - waypoints[0];
	// max distance from corner where the circular trajectory may start
	let xRemaining = lastPathDir.length();
	let prev = waypoints[1];

	// {startSpeed, endSpeed, distance, linearSpeedChange}
	// if not linear, then startSpeed is the maximum allowed speed, brakes down to endSpeed as late as possible
	// !!! for every entry except the first. distance ~= 0 !!!
	let maxSpeedProfile: [number, number, number, boolean?][] = [ [startSpeed, maxSpeed, 0] ];

	// to calculate an angle two line segments are necessary
	for (let i = 2; i < waypoints.length;i++) {
		let newPathDir = waypoints[i] - prev;
		// limit angle for extremely sharp corners
		let angleDiff = Math.min(lastPathDir.absoluteAngleDiff(newPathDir), Math.PI - 0.001);

		// next to straight line or too small path segment for a stable direction
		if (angleDiff < 0.001 || lastPathDir.length() < 0.005) {
			if (xRemaining > 0) { // don't create empty segments
				maxSpeedProfile.push([maxSpeed, maxSpeed, xRemaining]); // just a straight line segment
				// vis.addPathRaw("waypoints"+tostring(i), {prev - lastPathDir, prev}, vis.colors.blue)
			}
			// no curve -> new path segment can be used completely
			xRemaining = newPathDir.length();
		} else {
			// TODO use corridor width for maxError calculation
			let angleSin = Math.sin((Math.PI - angleDiff) / 2);
			let angleTan = Math.tan((Math.PI - angleDiff) / 2);
			let radius = maxError * angleSin / (1 - angleSin); // osculating circle radius
			let maxRadius = maxSpeed * maxSpeed / accelLimit; // no speed benefit from larger radius
			radius = Math.min(radius, maxRadius);

			// possible speed at circle start
			let possibleStartRadius = xRemaining * angleTan; // limit circle radius to available space
			let startRadius = Math.min(radius, possibleStartRadius);
			let maxStartSpeed = Math.sqrt(startRadius * accelLimit);

			// possible speed at circle end
			// TODO improve switch point calculation
			let xMaxNext = newPathDir.length() * 0.5;
			let possibleEndRadius = xMaxNext * angleTan; // limit circle radius to available space
			let endRadius = Math.min(radius, possibleEndRadius);
			let maxEndSpeed = Math.sqrt(endRadius * accelLimit);

			// time and speed calculation
			let startDist = startRadius * (1 / angleTan);
			let endDist = endRadius * (1 / angleTan);
			// ensure that startSpeed is still usable when the robot has nearly reached the corner
			if (i === 2 && startDist < endDist) {
				maxStartSpeed = maxEndSpeed;
				startDist = endDist;
			}
			// just another estimation
			let actualDist = angleDiff * (startRadius + endRadius) * 0.5;
			if (xRemaining > startDist) {
				maxSpeedProfile.push([maxSpeed, maxSpeed, xRemaining - startDist]); // straight line segment
				// vis.addPathRaw("waypoints"+tostring(i), {prev - lastPathDir.withLength(xRemaining), prev - lastPathDir.withLength(startDist)}, vis.colors.blue)
			}
			maxSpeedProfile.push([maxStartSpeed, maxEndSpeed, actualDist, true]); // curved part
			vis.addPathRaw("waypoints"
				// ..tostring(i)
				, [prev - lastPathDir.withLength(startDist), prev + newPathDir.withLength(endDist)], vis.colors.blue);
			xRemaining = newPathDir.length() - endDist; // >= newPathDir.length() / 2
		}
		// update path segments
		lastPathDir = newPathDir;
		prev = waypoints[i];
	}

	if (xRemaining > 0) {
		maxSpeedProfile.push([maxSpeed, endSpeed, xRemaining]); // end segment
		// vis.addPathRaw("waypoints"+"End", {prev - lastPathDir.withLength(xRemaining), prev}, vis.colors.blue)
	}

	return maxSpeedProfile;
}

// brake must be a negative value
// ensures that the speedProfile ends with at most maxSpeed
// if braking is necessary this is down with the deceleration brake
function _backpropagateSpeedLimit(speedProfile: number[][], maxSpeed: number, brake: number) {
	// no need to slow down
	if (speedProfile[speedProfile.length - 1][1] <= maxSpeed) {
		return;
	}

	// main idea.
	// the current robot speed is too high
	// thus start braking earlier as brake is the fastest possible deceleration
	// the new speed will always be lower than the old one, except for the injectTime
	// The injectTime is required to keep the total distance unchanged
	// TODO robot could be faster during time injection
	let endTime = speedProfile[speedProfile.length - 1][0]; // end time of the speed profile
	if (endTime === 0) { // empty speed profile
		speedProfile.splice(0, speedProfile.length);
		speedProfile.push([0, maxSpeed]);
		return;
	}

	let distance = 0;
	for (let i = speedProfile.length - 2;i >= 0;i--) {
		let entry = speedProfile[i];
		let nextEntry = speedProfile[i + 1]; // only used for acceleration calculations

		// max possible speed at the current time to allow braking down to maxSpeed
		// actually just an approximation as the distance travelled while braking
		// is less than the distance travelled with the original speed
		distance = distance + (nextEntry[1] + entry[1]) / 2 * (nextEntry[0] - entry[0]); // integrate distance
		// distance and start speed for braking over the distance
		let fullBrakeTime = (-maxSpeed + Math.sqrt(maxSpeed * maxSpeed - 2 * brake * distance)) / (-brake);
		let maxTimedSpeed = maxSpeed - brake * fullBrakeTime;
		// can brake starting from the current entry
		if (entry[1] < maxTimedSpeed) { // skips entries with zero timediff
			// acceleration currently used by the entry, always > brake
			let oldAccel = (nextEntry[1] - entry[1]) / (nextEntry[0] - entry[0]);
			// entry[2] is less then maxTimedSpeed
			// thus just cut the old speed curve with the brake curve
			// time relative to entry[1]
			let switchAfter = (maxTimedSpeed - entry[1]) / (oldAccel - brake);
			let switchTime = entry[0] + switchAfter;
			let switchSpeed = entry[1] + switchAfter * oldAccel; // speed at the switch point

			// time required to slow down to maxSpeed
			let brakeTime = (switchSpeed - maxSpeed) / (-brake);

			// previous speed was higher thus a larger distance was travelled
			// just keep the speed at the switch point until the missing distance is covered
			// this is not the optimum but saves from doing a lot of corner case handling
			let missingDistance = distance - (entry[1] + switchSpeed) / 2 * switchAfter
					- (switchSpeed + maxSpeed) / 2 * brakeTime;
			let injectTime = Math.max(0, missingDistance / switchSpeed);

			if (oldAccel > 0) {
				// Fomulas for wxMaxima
				// solve(v_0=v_0+a*t_mid+b*(t_end-t_mid),t_end);
				// assume(a > 0);assume(b < 0);assume(d > 0);assume(t_end>t_mid);
				// ratsimp(integrate(v_0+a*t,t,0,t_mid)+integrate(v_0+a*t_mid+b*(t-t_mid),t,t_mid,t_end)=d);
				let v_0 = switchSpeed, a = oldAccel, b = brake,d = missingDistance;
				let t1 = MathUtil.solveSq(b - a, 2 * (b - a) * v_0, -2 * b * d)[0];
				if (t1 != undefined && t1 > 0) {
					switchTime = switchTime + t1;
					switchSpeed = switchSpeed + t1 * oldAccel;
					injectTime = 0;
					brakeTime = (switchSpeed - maxSpeed) / (-brake);
				}
			}

			// remove all speed entries after the current one
			speedProfile.splice(i + 1, speedProfile.length - i - 1);
			if (switchSpeed !== entry[1]) { // just a duplicate
				speedProfile.push([switchTime, switchSpeed]); // remaining part with old accel
			}
			if (injectTime > 0) {
				speedProfile.push([switchTime + injectTime, switchSpeed]); // injected speed
			}
			speedProfile.push([switchTime + injectTime + brakeTime, maxSpeed]); // brake to maxSpeed
			return;
		}
	}

	// special case, robot starts too fast, just cut down the initial speed
	let startSpeed = speedProfile[0][1];
	// time required for braking on that distance
	endTime = 2 * distance / (startSpeed + maxSpeed);
	// replace speedProfile entries
	speedProfile.splice(0, speedProfile.length);
	speedProfile.push([0, startSpeed]);
	speedProfile.push([endTime, maxSpeed]);
}

// assumes that the startSpeed limit is not violated by speedProfile!
function _addLinearSpeedSegment(speedProfile: number[][], startSpeed: number, endSpeed: number, distance: number,
		accelerate: number, brake: number) {
	let startEntry = speedProfile[speedProfile.length - 1];
	let startTime = startEntry[0];
	let speed = startEntry[1];
	if (startSpeed < speed) {
		throw new Error("invalid speedProfile");
	}

	let accelTime = 0;
	let accel = accelerate;

	let linearAccel = (endSpeed - speed) / distance * (endSpeed + speed) / 2;
	if (linearAccel > accelerate || linearAccel < brake) {
		// too slow or too fast to reach endSpeed
		accel = MathUtil.bound(brake, linearAccel, accelerate);
		// linearAccel is either brake or accelerate
		accelTime = (-speed + Math.sqrt(speed * speed + 2 * accel * distance)) / accel;
	} else if (startSpeed === endSpeed) {
		// time required for distance if permanently accelerating with accelerate
		accelTime = (-speed + Math.sqrt(speed * speed + 2 * accelerate * distance)) / accelerate;
		// limit to time required for reaching maxSpeed (= startSpeed or endSpeed)
		accelTime = Math.min(accelTime, (startSpeed - speed) / accelerate);
	} else if (speed < startSpeed - 0.001) {
		// Fomulas for wxMaxima
		// solve(v_0+a*t_mid=v_s+(v_e-v_s)*t_mid/t_end,t_end); -> set t_end to result
		// assume(a > (v_e-v_s)/t_end);assume(a > 0);assume(d > 0);
		// solve(integrate(v_0+a*t,t,0,t_mid)+integrate(v_s+(v_e-v_s)*t/t_end,t,t_mid,t_end)=d,t_mid);
		let a = accelerate, d = distance, v_0 = speed, v_s = startSpeed, v_e = endSpeed;
		accelTime = (Math.sqrt((4 * v_0 * v_0 + 8 * a * d) * v_s * v_s + (-4 * v_0 * v_e * v_e - 4 * v_0 * v_0 * v_0 - 8 * a * d * v_0) * v_s + v_e * v_e * v_e * v_e
			+ (2 * v_0 * v_0 - 4 * a * d) * v_e * v_e + v_0 * v_0 * v_0 * v_0 + 4 * a * d * v_0 * v_0 + 4 * a * a * d * d) - 2 * v_0 * v_s + v_e * v_e + v_0 * v_0 - 2 * a * d) / (2 * a * v_s - 2 * a * v_0);
	}
	// nothing to do if startSpeed == speed
	// acceleration part
	if (accelTime > 0) {
		let accelSpeed = speed + accelTime * accel;
		speedProfile.push([startTime + accelTime, accelSpeed]);
		// update time and remaining distance
		startTime = startTime + accelTime;
		distance = distance - accelTime * (speed + accelSpeed) / 2;
		startSpeed = accelSpeed; // speed at start of the linear segment
	}

	// work around numerical precision problem
	if (distance > 0.00001) { // robot is driving with startSpeed
		// solve(integrate(v_s+(v_e-v_s)/t_end*t,t,0,t_end)=d,t_end);
		let linTime = (2 * distance) / (startSpeed + endSpeed);
		speedProfile.push([startTime + linTime, endSpeed]);
	}
}

// accelerate must be a positive value
// brake must be a negative value
// speed profile for forward movement, the speed limits in maxSpeedProfile are derived from sidewards movement limits
function _calculate1DSpeedProfile(maxSpeedProfile: [number, number, number, boolean?][], accelerate: number, brake: number): number[][] {
	let speedProfile = [ [0, maxSpeedProfile[0][0]] ]; // begin with start speed
	let initialSpeed = speedProfile[0][1];
	// handle negative start speed by braking and moving back
	if (initialSpeed < 0) {
		let brakeTime = initialSpeed / brake;
		let brakeDist = (-initialSpeed) / 2 * brakeTime;
		speedProfile.push([brakeTime, 0]);
		if (brakeTime < 0) {
			throw new Error("invalid brake time");
		}
		// move back to start point
		let vrestore = Math.sqrt(2 * accelerate * brakeDist);
		let restoreTime = vrestore / accelerate;
		speedProfile.push([brakeTime + restoreTime, vrestore]);
	}

	// skip maxSpeedProfile entry containing the current robot and max speed
	for (let i = 1;i < maxSpeedProfile.length;i++) {
		let segment = maxSpeedProfile[i];
		let startSpeed = segment[0];
		let endSpeed = segment[1];
		let distance = segment[2];
		let linearSpeedChange = segment[3];

		// ensure that the startSpeed limit is respected
		_backpropagateSpeedLimit(speedProfile, startSpeed, brake);

		if (linearSpeedChange) { // used for curves
			_addLinearSpeedSegment(speedProfile, startSpeed, endSpeed, distance, accelerate, brake);
		} else { // accelerate to at most start speed
			_addLinearSpeedSegment(speedProfile, startSpeed, startSpeed, distance, accelerate, brake);
		}
		// add braking down to endSpeed
		_backpropagateSpeedLimit(speedProfile, endSpeed, brake);
	}

	return speedProfile;
}

function _decreaseDistance(speedProfile: number[][], cutoffDistance: number): number {
	let currentDistance = 0;
	let cutoffAfter = 1; // always keep the first speedProfile segment
	for (let i = speedProfile.length - 2;i >= 0;i--) {
		let segmentDistance = (speedProfile[i + 1][1] + speedProfile[i][1]) / 2 * (speedProfile[i + 1][0] - speedProfile[i][0]);

		if (currentDistance <= cutoffDistance && cutoffDistance < currentDistance + segmentDistance) {
			let accel = (speedProfile[i + 1][1] - speedProfile[i][1]) / (speedProfile[i + 1][0] - speedProfile[i][0]);
			let endSpeed = speedProfile[i + 1][1];
			let distLeft = cutoffDistance - currentDistance;
			// calculate time from end of the segment
			let time;
			if (accel === 0) {
				time = distLeft / endSpeed;
			} else {
				time = (-endSpeed + Math.sqrt(endSpeed * endSpeed - 2 * accel * distLeft)) / -accel;
			}
			speedProfile[i + 1][0] = speedProfile[i + 1][0] - time;
			speedProfile[i + 1][1] = speedProfile[i][1] + (speedProfile[i + 1][0] - speedProfile[i][0]) * accel;
			currentDistance = cutoffDistance;
			cutoffAfter = i + 2;
			break;
		} else {
			currentDistance = currentDistance + segmentDistance;
		}
	}
	speedProfile.splice(cutoffAfter + 1, speedProfile.length - cutoffAfter - 1);
	return currentDistance;
}

function _injectExponentialFalloff(speedProfile: number[][], exponentialTime: number, exponentialError: number,
		brake: number, endSpeedLen: number) {
	// FIXME? may ignore maxSpeed
	// handle exponential falloff
	if (speedProfile[speedProfile.length - 1][1] >= endSpeedLen // too fast -> exponential falloff
			&& speedProfile[speedProfile.length - 2][1] > speedProfile[speedProfile.length - 1][1]) { // decelerating
		// v(t) = v_0 * e^(-k*t)  <//> v(dist) = k*dist
		// v_0 = expStartSpeed
		// v'(0) = brake -> k = 1/exponentialTime
		let k = 1 / exponentialTime;
		let timeFactor = -Math.log(exponentialError);
		let expStartSpeed = exponentialTime * -brake;
		// integrate v(t) from 0 to +inf + distance traveled with endSpeed
		let expDistance = expStartSpeed * exponentialTime;
		let distance = expDistance + timeFactor * exponentialTime * endSpeedLen;
		// <= distance, < distance if speedProfile is too short
		let actualDistance = _decreaseDistance(speedProfile, distance);

		// ignore the case that speedProfile < curSpeedLimit
		// just drive with the calculated speed, this can cause the speed profile to be too "short"
		// but as the moveTarget is selected before this doesn't matter
		// it is also very complex too solve and only introduces a small error thus its not worth the trouble
		if (actualDistance >= distance) { // not in exponential part
			let startSpeed = expStartSpeed + endSpeedLen;
			_backpropagateSpeedLimit(speedProfile, startSpeed, brake);
		} else {
			// assume target is reached if exponential part traveled a distance of (1-exponentialError)*expDistance
			// solve integrate(expStartSpeed*%e^(-k*t)+endSpeed,t,0,t)=expDistance+endSpeed*fac-d for t
			// actualDistance decreases when getting closer to the target
			let time = 2 * exponentialTime; // initial guess
			let expTime = timeFactor * exponentialTime;
			for (let i = 0;i < 10;i++) {
				let e = Math.exp(-k * time);
				// only consider endSpeedLen for a distance of expTime * endSpeedLen
				let err = Math.max(0, time - expTime) * endSpeedLen - e * expDistance + actualDistance;
				let diff;
				if (time < expTime) {
					diff = expStartSpeed * e + endSpeedLen;
				} else {
					diff = expStartSpeed * e;
				}
				time = MathUtil.bound(0, time - err / diff, 10 * exponentialTime);
			}

			timeFactor = Math.max(0, timeFactor - time / exponentialTime);

			let curSpeedLimit = expStartSpeed * Math.exp(-k * time) + endSpeedLen;
			speedProfile.splice(0, speedProfile.length);
			speedProfile.push([0, curSpeedLimit]);
			// disable deceleration of controller for exponential part
			let timeQuantum = 0.001;
			if (timeFactor * exponentialTime > timeQuantum) {
				speedProfile.push([timeQuantum, curSpeedLimit]);
			}
		}

		// fake end time
		let endTime = speedProfile[speedProfile.length - 1][0] + timeFactor * exponentialTime;
		speedProfile.push([endTime, speedProfile[speedProfile.length - 1][1]]);
	}
	return speedProfile;
}

function _speedAtTime(speedProfile: number[][], time: number): number {
	let endIdx = speedProfile.length;
	for (let i = 1;i < speedProfile.length;i++) {
		if (speedProfile[i][0] >= time) {
			endIdx = i;
			break;
		}
	}
	if (endIdx >= speedProfile.length) {
		return speedProfile[speedProfile.length - 1][1];
	} else {
		let accel = (speedProfile[endIdx][1] - speedProfile[endIdx - 1][1]) / (speedProfile[endIdx][0] - speedProfile[endIdx - 1][0]);
		if (speedProfile[endIdx][0] - speedProfile[endIdx - 1][0] === 0) {
			// segement has duration of 0 seconds
			accel = 0;
		}
		return speedProfile[endIdx - 1][1] + accel * (time - speedProfile[endIdx - 1][0]);
	}
}

function _calculateSpeed(robotId: number, waypoints: Position[], maxSpeedProfile: [number, number, number, boolean?][],
		speedProfile: number[][], robotSpeed: Speed, accelLimit: number, sidewardsErrorFactor: number): [Speed, Vector] {
	let timeOffset = 0.00;
	let timeStep = 0.02;
	let speed = _speedAtTime(speedProfile, timeOffset);
	let speedNextStep = _speedAtTime(speedProfile, timeOffset + timeStep);
	let accel = (speedNextStep - speed) * (1 / timeStep);
	// if target is reached
	if (speedProfile[1][0] === speedProfile[0][0]) {
		accel = 0;
	}

	// workaround for unwanted controller behavior; account for numerical precision errors
	if (robotSpeed.length() < speed - 0.001 && accel < 0) {
		accel = 0; // too slow, don't brake to allow the robot to get up to speed
	}

	if (speed < 0) {
		// make sure the robot doesn't brake until it moves backwards
		speed = 0;
		accel = 0;
	}

	// don't drive backwards, just brake as fast as possible
	speed = Math.max(0, speed);
	let moveDir = waypoints[1] - waypoints[0];
	let speedVector = moveDir.withLength(speed);
	let accelVector = moveDir.withLength(accel);

	plot.addPlot(`${robotId}.speed`, speed);
	// debug.set("speed", speedVector)
	// debug.set("accel", accelVector)

	if (speedVector.length() >= 0.0001) {
		// check if the robot is on a curve segment
		if (maxSpeedProfile.length >= 2 && maxSpeedProfile[1][3]) {
			let forwardDir = moveDir.normalized().dot(robotSpeed);
			// add acceleration towards the curve center, reduce accerlation if the robot is slower than expected
			let angle = (waypoints[1] - waypoints[0]).angleDiff(waypoints[2] - waypoints[1]);
			let scale = MathUtil.bound(0.02, Math.min(forwardDir, speed) / Math.max(maxSpeedProfile[1][0], maxSpeedProfile[1][1]), 1);
			accelVector = accelVector - moveDir.perpendicular().withLength(MathUtil.sign(angle) * accelLimit * scale * scale);
		}
		// calculate how fast the robot is moving perpendicular to the speedVector
		// add acceleration in the opposite direction
		let sidewardSpeed = moveDir.perpendicular().normalized();
		sidewardSpeed.withLength(-sidewardSpeed.dot(robotSpeed) * sidewardsErrorFactor);
		accelVector = accelVector + sidewardSpeed;
	}

	return [speedVector, accelVector];
}

export class CurvedMaxAccel extends TrajectoryHandler {
	private rotationCalculation: DirectRotation = new DirectRotation();

	private _getPath(targetPos: Position): Position[] {
		this._robot.path.setProbabilities(0.15, 0.65);
		PathHelper.insertObstacles(this._robot as FriendlyRobot, true, targetPos);
		targetPos = Coordinates.toGlobal(targetPos);
		let robotPos = Coordinates.toGlobal(this._robot.pos);

		// first waypoint is the current robot position
		// if reaching the end is possible there's a waypoint at the end
		let waypoints: any[] = this._robot.path.getPath(robotPos.x, robotPos.y, targetPos.x, targetPos.y);
		// debug.set("waypoints_result", waypoints);

		// convert waypoints to vectors and draw
		let waypointsVector: Position[] = [];
		for (let i = 0;i < waypoints.length;i++) {
			waypointsVector.push(new Vector(waypoints[i].p_x, waypoints[i].p_y));
		}

		let waypointsColor = vis.colors.yellow;
		if (waypointsVector[waypointsVector.length - 1].distanceTo(targetPos) > 0.01) {
			// orange path if target can't be reached
			waypointsColor = vis.colors.orange;
		}
		// draw all at once
		vis.addPathRaw("waypoints", waypointsVector, waypointsColor);

		if (waypointsVector.length <= 1) { // no waypoints
			if (robotPos.distanceTo(targetPos) > 0.01) {
				// no way to target
				vis.addCircleRaw("waypoints", robotPos, 0.05, vis.colors.orangeHalf);
			}
			return [];
		} else if (waypointsVector.length === 2) {
			// distance error < 0.1 mm
			if (waypointsVector[0].distanceTo(waypointsVector[1]) < 0.0001) {
				return [];
			}
		}

		return waypointsVector;
	}

	public update(targetPos: Position, targetDir: number = 0, maxSpeed: number = this._robot.maxSpeed,
			endSpeed: Speed = new Vector(0, 0), accelScale: number = 1.0, dribble: boolean = false): TrajectoryResult {

		let directionVector = Vector.fromPolar(targetDir, 0.09);
		vis.addPath("MoveTo", [targetPos, targetPos + directionVector], vis.colors.yellowHalf);
		if (endSpeed != undefined && endSpeed.length() > 0.001) {
			vis.addPath("MoveTo", [targetPos, targetPos + endSpeed], vis.colors.whiteQuarter);
		}


		// configuration
		let maxError = 0.03; // maxError in meters when driving a curve
		let accelerationFactor = accelScale; // factor for max forward speedup and braking
		let exponentialTime = 0.1; // timespan in seconds replace with exponential falloff
		let exponentialError = 0.2; // relative
		let sidewardsErrorFactor = 10; // used to scale sidewards speed error

		let rotationExponentialTime = 0.1;
		let rotationAccelerationFactor = dribble ? 0.25 : 1;

		// insert default values
		if (Referee.isSlowDriveState()) {
			maxSpeed = Math.min(maxSpeed, (World.IsLargeField ? Constants.stopSpeed : 1) - 0.25);
		}
		// change endSpeed to global coordinates
		endSpeed = endSpeed != undefined ? Coordinates.toGlobal(endSpeed) : new Vector(0, 0);

		// helper variables
		let robotPos = Coordinates.toGlobal(this._robot.pos);
		let robotSpeed = Coordinates.toGlobal(this._robot.speed);
		let robotDir = Coordinates.toGlobal(this._robot.dir);

		let rotAccelerate = Math.abs(this._robot.acceleration
			? this._robot.acceleration.aSpeedupPhiMax : 1.0) * rotationAccelerationFactor;
		let rotBrake = -Math.abs(this._robot.acceleration
			? this._robot.acceleration.aBrakePhiMax : 1.0) * rotationAccelerationFactor;

		let rotMaxSpeed = dribble ? 1.0 : this._robot.maxAngularSpeed;

		let waypoints = this._getPath(targetPos);
		if (waypoints.length === 0) { // no waypoints left, just stay here but also update the orientation
			targetDir = Coordinates.toGlobal(targetDir);
			let [angularSpeed, angularAccel] = this.rotationCalculation.calculateRotationHysteresis(robotDir, this._robot.angularSpeed, targetDir,
				rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime);
			let spline = [ {t_start: 0, t_end: Infinity,
				x: { a0: robotPos.x, a1: endSpeed.x, a2: 0, a3: 0 },
				y: { a0: robotPos.y, a1: endSpeed.y, a2: 0, a3: 0 },
				phi: { a0: robotDir, a1: angularSpeed, a2: angularAccel / 2, a3: 0}
			} ];
			return [{spline: spline}, targetPos, 0];
		}


		// no endspeed if the target can't be reached because it's in an obstacle
		// must be calculated in all global coordinates
		if (waypoints[waypoints.length - 1].distanceTo(Coordinates.toGlobal(targetPos)) > 0.02) {
			endSpeed = new Vector(0, 0);
		}

		// get acceleration values
		// maximum sidewards acceleration
		let accelLimit = Math.abs(this._robot.acceleration.aSpeedupSMax);
		// forward acceleration and deceleration

		// dribble. backward. speed & accel, forward brake
		let accelerate = Math.abs(this._robot.acceleration.aSpeedupFMax) * accelerationFactor; // * (dribble and 0.2 or 1)
		let brake = -Math.abs(this._robot.acceleration.aBrakeFMax) * accelerationFactor  * (dribble ? 0.8 : 1);
		// 	if dribble then
		// 		maxSpeed = 0.5
		// 	end

		// smooth first corner
		_preprocessPath(waypoints, maxError, robotPos, robotSpeed);
		for (let w of waypoints) {
			vis.addCircleRaw("waypoints_raw", w, 0.1, vis.colors.green);
		}

		// calculate robot speed in target direction
		// unexpected sidewards speed is handled in _calculateSpeed
		// handling it here doesn't work as this adds a phantom speed
		let startSpeed = (waypoints[1] - waypoints[0]).normalized().dot(robotSpeed);
		// debug.set("startSpeed", startSpeed);
		// handle endSpeed
		let endSpeedLen = Math.max(0, (waypoints[waypoints.length - 1] - waypoints[waypoints.length - 2]).normalized().dot(endSpeed));
		// calculate speed limits for curve segments based on sidewards acceleration limits while driving curves
		let maxSpeedProfile = _calculateCurveSpeedLimits(waypoints, accelLimit, maxSpeed, maxError, startSpeed, endSpeedLen);
		// debug.set("maxSpeedProfile", maxSpeedProfile)
		// convert to actual speed curve
		let speedProfile = _calculate1DSpeedProfile(maxSpeedProfile, accelerate, brake);
		// debug.set("speedProfile", speedProfile)

		_injectExponentialFalloff(speedProfile, exponentialTime, exponentialError, brake, endSpeedLen);
		// debug.set("speedProfile2", speedProfile)

		let [speedVector, accelVector] = _calculateSpeed(this._robot.id, waypoints, maxSpeedProfile, speedProfile, robotSpeed, accelLimit, sidewardsErrorFactor);

		if (dribble && waypoints.length > 1 && waypoints[0].distanceTo(waypoints[1]) > 0.01) {
			targetDir = (waypoints[1] - waypoints[0]).angle();
			let sgn = 1;
			let sin = Math.sin(accelVector.angleDiff(speedVector));
			// if acceleration is not large eanough or is almost parallel, we assume we're not going to drive a curve.
			if (Math.abs(sin) < 0.1 || accelVector.length() < 0.1) {
				sgn = 0;
			} else if (sin < 0) {
				sgn = -1;
			}
			if (sgn !== 0) {
				// although we drive a parabel, we try to fit a circle to calculate centripetal acceleration for the ball
				// we assume |v| as r
				vis.addCircleRaw("circle_fitting", robotPos + speedVector.perpendicular() * sgn, speedVector.length(), vis.colors.green);
				// phi = atan(v * v / r * MY * G)
				// G. acceleration of gravity\
				// MY. friction of the carpet, m_ball * Costants.fastBallDeceleration = MY * m_ball * G
				// -> MY * G = World.BallModel.FastBallDeceleration
				// we assume v = r, so phi = atan (v / Constants.fBD)
				let speed = speedVector.length();
				let phi = -Math.atan(speed / Math.abs(World.BallModel.FastBallDeceleration));
				targetDir = targetDir + sgn * phi;
			}
		} else {
			targetDir = Coordinates.toGlobal(targetDir);
		}
		let [angularSpeed, angularAccel] = this.rotationCalculation.calculateRotationHysteresis(robotDir,
			this._robot.angularSpeed, targetDir, rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime);

		let spline = [ {t_start: 0, t_end: Infinity,
			x: { a0: robotPos.x, a1: speedVector.x, a2: accelVector.x / 2, a3: 0 },
			y: { a0: robotPos.y, a1: speedVector.y, a2: accelVector.y / 2, a3: 0 },
			phi: { a0: robotDir, a1: angularSpeed, a2: angularAccel / 2, a3: 0}
		} ];

		let endTime = speedProfile[speedProfile.length - 1][1];
		return [{spline: spline}, targetPos, endTime];
	}

	canHandle(...args: any[]): boolean {
		return true;
	}
}
