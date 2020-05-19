import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Robot, RobotAccelerationProfile } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";
// import * as Roboobserver from "glados/observer/robot";

export interface BallLike {
	pos: Readonly<Position>;
	speed: Readonly<Speed>;
	maxSpeed: number;
	radius?: number;
	posZ?: number;
	speedZ?: number;
	initSpeedZ?: number;
}


/**
 * Calculates the parameters for the switch between sliding and rolling
 * @param ball - A ball-like structure, must contail the fields pos, speed and maxSpeed
 * @returns The switch time
 * @returns The absolute ball speed at switch time
 * @returns The distance the ball travels until switch time
 */
export function ballSwitchParameters(ball: BallLike): [number, number, number] {
	let a_slide = Constants.fastBallDeceleration;
	let a_roll = Constants.ballDeceleration;
	let v_max = ball.maxSpeed;
	let v_switch = Constants.ballSwitchRatio * v_max;
	let v_current = ball.speed.length();
	let t_switch, s_switch;
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide;
		s_switch = (v_current + 0.5 * a_slide * t_switch) * t_switch;
	} else {
		t_switch = (v_switch - v_current) / a_roll;
		s_switch = (v_current + 0.5 * a_roll * t_switch) * t_switch;
	}
	return [t_switch, v_switch, s_switch];
}

/**
 * Predicts the ball
 * @param ball - A ball-like structure, must contain the fields pos, speed, maxSpeed and radius
 * @param time - The number of seconds from now on
 * @returns The predicted ball as a ball-like structure
 */
export function ballAtTime(ball: BallLike, time: number): BallLike & {radius: number} {
	// formulas used:
	// v = a * t + v0
	// t = (v - v0) / a
	// s = 1/2 * a * t^2 + v0 * t + s0

	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration;
	let a_roll = Constants.ballDeceleration;

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed;
	let v_switch = Constants.ballSwitchRatio * v_max;
	let v_current = ball.speed.length();

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch;
	let s_switch;

	// result: the ball-like returned object
	// since we don't do collision calculation, maxSpeed always stays the same
	let result: BallLike & {radius: number} = <BallLike & {radius: number}> {radius: ball.radius, maxSpeed: ball.maxSpeed};

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide;
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch;

		// if "time" is in the sliding stage
		if (time <= t_switch) {
			let v_result = a_slide * time + v_current;
			let s_result = a_slide / 2 * time * time + v_current * time;
			result.speed = ball.speed.withLength(v_result);
			result.pos = ball.pos + ball.speed.withLength(s_result);
			return result;
		}
	} else {
		t_switch = 0;
		s_switch = 0;
		v_switch = v_current;
	}

	// t_roll: how long the ball stays in the rolling stage
	let t_roll = (0 - v_switch) / a_roll;

	// if "time" is after the ball has stopped
	if (time >= t_switch + t_roll) {
		let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch;
		result.speed = new Vector(0, 0);
		result.pos = ball.pos + ball.speed.withLength(s_result);
		return result;
	}

	// if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch;

	let v_result = a_roll * t_roll + v_switch;
	let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch;
	result.speed = ball.speed.withLength(v_result);
	result.pos = ball.pos + ball.speed.withLength(s_result);
	return result;
}

/**
 * Predicts the ball
 * @param ball - A ball-like structure, must contain the fields pos, speed, maxSpeed, posZ, speedZ and radius
 * @param time - The number of seconds from now on
 * @returns The predicted ball as a ball-like structure
 */
export function ballAtTimeExperimental(ball: BallLike & {posZ: number, speedZ: number}, time: number): BallLike {
	// formulas used:
	// v = a * t + v0
	// t = (v - v0) / a
	// s = 1/2 * a * t^2 + v0 * t + s0

	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration;
	let a_roll = Constants.ballDeceleration;

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed;
	let v_switch = Constants.ballSwitchRatio * v_max;
	let v_current = ball.speed.length();

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch;
	let s_switch;

	// result: the ball-like returned object
	let result: BallLike = <BallLike> {};

	// since we don't do collision calculation, maxSpeed always stays the same
	result.maxSpeed = ball.maxSpeed;
	result.radius = ball.radius;
	result.pos = ball.pos;
	result.posZ = ball.posZ;
	result.speed = ball.speed;
	result.speedZ = ball.speedZ;



	// flying stage
	if (ball.posZ > 0.1) {

		let v0 = ball.speedZ;
		let h0 = ball.posZ;

		// h(t) = (t^2 / 2) * (-9.81) + t * v0 + h0
		// h(t) == 0; midnight formula
		let impactTime = (-v0 + Math.sqrt(v0 * v0 + (4 * (-9.81 / 2) * h0))) / (-9.81);
		let impactSpeed = impactTime * 9.81 - v0;
		let timePassed = 0;

		while (impactTime < time - timePassed) { // subsequent bouncing
			timePassed = timePassed + impactTime;
			v0 = impactSpeed * Constants.floorDamping;
			h0 = 0;

			let liftTime = v0 / 9.81;
			let flightHeight = liftTime * liftTime * (-9.81) / 2 + liftTime * v0;
			if (flightHeight < 0.03) { // consider ball rolling
				break;
			}

			result.pos = result.pos + ball.speed * impactTime;

			impactTime = (-v0 + Math.sqrt(v0 * v0 + (2 * (-9.81) * h0))) / (-9.81);
			impactSpeed = impactTime * 9.81 - v0;
		}

		if (impactTime > time - timePassed) { // flight or bouncing not finished
			let t = time - timePassed;
			result.pos = result.pos + ball.speed * t;
			result.posZ = h0 + v0 * t - 0.5 * 9.81 * t * t;
			result.speedZ = v0 - t * 9.81;
			return result;
		}
		time = time - timePassed;
	}

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide;
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch;

		// if "time" is in the sliding stage
		if (time <= t_switch) {
			let v_result = a_slide * time + v_current;
			let s_result = a_slide / 2 * time * time + v_current * time;
			result.speed = ball.speed.withLength(v_result);
			result.pos = result.pos + ball.speed.withLength(s_result);
			return result;
		}
	} else {
		t_switch = 0;
		s_switch = 0;
		v_switch = v_current;
	}

	// t_roll: how long the ball stays in the rolling stage
	let t_roll = (0 - v_switch) / a_roll;

	// if "time" is after the ball has stopped
	if (time >= t_switch + t_roll) {
		let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch;
		result.speed = new Vector(0, 0);
		result.pos = result.pos + ball.speed.withLength(s_result);
		return result;
	}

	// if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch;

	let v_result = a_roll * t_roll + v_switch;
	let s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch;
	result.speed = ball.speed.withLength(v_result);
	result.pos = result.pos + ball.speed.withLength(s_result);
	return result;
}

/**
 * Estimates how long a ball will be flying or subsequently bouncing for a given distance
 * @param ball - A ball-like structure
 * @param distance - The distance in meter
 * @returns Ball, number, number - predicted ball, time, distance left
 * The third return value indicates how much distance is left when the ball stopped bouncing
 */
function ballFlightTime(ball: BallLike & {initSpeedZ: number, speedZ: number, posZ: number}, distance: number): [BallLike, number, number] {
	let liftTime = ball.initSpeedZ / 9.81;
	let timeAlreadyFlying = (ball.initSpeedZ - ball.speedZ) / 9.81;
	let flightTime = (2 * liftTime) - timeAlreadyFlying;
	let flightDist = ball.maxSpeed * flightTime;
	let flightDistDone = 0;
	let timePassed = 0;

	let result = {pos: ball.pos, speedZ: ball.speedZ, posZ: ball.posZ, initSpeedZ: ball.initSpeedZ!, speed: ball.speed, radius: ball.radius, maxSpeed: ball.maxSpeed};

	while (flightDist < distance) { // subsequent bouncing
		timePassed = timePassed + flightTime;
		result.initSpeedZ = result.initSpeedZ * Constants.floorDamping;
		liftTime = result.initSpeedZ / 9.81;
		let flightHeight = result.initSpeedZ * liftTime - (9.81 / 2) * liftTime * liftTime;
		if (flightHeight < 0.03) { // consider ball rolling
			break;
		}
		flightTime = 2 * liftTime;
		flightDistDone = flightDist;
		flightDist = flightDist + result.speed.length() * flightTime;
	}

	if (flightDist > distance) { // flight or bouncing not finished
		let t = (distance - flightDistDone) / result.speed.length();
		result.pos = result.pos + result.speed.withLength(distance);
		result.posZ = result.posZ + result.initSpeedZ * t - 0.5 * 9.81 * t * t;
		result.speedZ = result.speedZ - t * 9.81;
		return [result, timePassed, 0];
	} else {// ball is rolling
		result.pos = result.pos + result.speed * timePassed;
		result.posZ = 0;
		result.speedZ = 0;
		return [result, timePassed, distance - flightDistDone];
	}
}


/**
 * Predicts how far the ball will travel in the given time
 * this is almost the same as ballAtTime, but it's a bit faster as it doesn't have to care about vectors and end speed
 * @param ball - A ball-like structure, must contain the fields pos, speed, maxSpeed and radius
 * @param time - The number of seconds from now on
 * @returns The predicted ball travel distance
 */
export function ballTravelledDistance(ball: BallLike, time: number): number {
	// formulas used:
	// v = a * t + v0
	// t = (v - v0) / a
	// s = 1/2 * a * t^2 + v0 * t + s0

	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration;
	let a_roll = Constants.ballDeceleration;

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed;
	let v_switch = Constants.ballSwitchRatio * v_max;
	let v_current = ball.speed.length();

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch;
	let s_switch;

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide;
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch;

		// if "time" is in the sliding stage
		if (time <= t_switch) {
			return a_slide / 2 * time * time + v_current * time;
		}
	} else {
		t_switch = 0;
		s_switch = 0;
		v_switch = v_current;
	}

	// t_roll: how long the ball stays in the rolling stage
	let t_roll = (0 - v_switch) / a_roll;

	// if "time" is after the ball has stopped
	if (time >= t_switch + t_roll) {
		return a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch;
	}

	// if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch;

	return a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch;
}

export function calculateChipSpeed(dist: number): number {
	// this flightDistance can be further investigated
	// also, a spinning ball could be considered
	let flightDistance = Constants.floorDamping * dist;

	// flight time t = 2 * vz/g => v = (t*g) / 2  (1)
	// t = distance / vground                     (2)
	// assume 45 degree chip angle => vz = vground
	// (2) in (1): v = sqrt(distance*g / 2)
	return Math.sqrt((flightDistance * 9.81) / 2);
}

export function robotBrakePos(robot: {pos: Position, speed: Speed, acceleration?: RobotAccelerationProfile}): Position {
	let BREAK_DEFAULT = 5; // rather overestimate than underestimte the opponent
	let brkAcc = robot.acceleration ? robot.acceleration.aBrakeFMax : BREAK_DEFAULT;
	let robotSpeed = robot.speed.length();
	let brkLength = 0.5 * robotSpeed * robotSpeed / brkAcc;
	return robot.pos + robot.speed.withLength(brkLength);
}

/** Estimates the time the ball needs to travel for a chip pass from startPos to endPos */
export function chipPassTime(startPos: Position, endPos: Position): number {
	let dist = endPos.distanceTo(startPos);
	let zSpeed = calculateChipSpeed(dist);
	let ball = {
		posZ: 0,
		initSpeedZ: zSpeed,
		speedZ: zSpeed,
		pos: startPos,
		// assume 45 degree chip angle => xySpeed = zSpeed
		speed: (endPos - startPos).withLength(zSpeed),
		maxSpeed: zSpeed
	};
	return ballTravelTime(ball, dist);
}

/**
 * Estimates the time the ball needs to travel a given distance
 * @param ball - A ball-like structure
 * @param distance - The distance in meter
 * @returns The estimated time
 */
export function ballTravelTime(ball: BallLike & {posZ: number, initSpeedZ: number, speedZ: number}, distance: number): number {
	if (ball.posZ > 0 || ball.initSpeedZ > 0) { // ball is flying
		let [newBall, time, restDist] = ballFlightTime(ball, distance);
		if (restDist != undefined) { // bouncing over
			return time + ballRollTime(newBall, restDist);
		} else {// ball still in the air or bouncing
			return time;
		}
	} else {
		return ballRollTime(ball, distance);
	}
}

/**
 * Estimates the time the ball needs to travel to a given position.
 * Checks if the position lies in front of the ball +- 90 degrees
 * If the pos is behind the ball, negative infinity is returned
 */
export function checkedBallTravelTime(ball: BallLike & {posZ: number, initSpeedZ: number, speedZ: number}, pos: Position): number {
	let toPos = pos - ball.pos;
	if (ball.speed.dot(toPos) > 0) {
		let distance = ball.pos.distanceTo(pos);
		return ballTravelTime(ball, distance);
	}
	return -Infinity;
}


/**
 * Estimates the time the ball needs to travel a given distance on the floor.
 * The estimation does not exceed ballStopTime() unless the distance is too
 * large, then it returns Infinity
 * @param ball - A ball-like structure
 * @param distance - The distance in meter
 * @returns The estimated time
 */
export function ballRollTime(ball: {speed: Speed, maxSpeed: number}, distance: number): number {
	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration;
	let a_roll = Constants.ballDeceleration;

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed;
	let v_switch = Constants.ballSwitchRatio * v_max;
	let v_current = ball.speed.length();

	// t_switch: the moment the ball starts rolling, from now [s]
	// s_switch: the distance the ball traveled before starting to roll [m]
	let t_switch;
	let s_switch;

	let epsilon = 0.000001;

	// ensure that the distance parameter is positive
	if (distance <= epsilon) {
		return 0;
	}

	// the sliding stage
	if (v_current > v_switch) {
		t_switch = (v_switch - v_current) / a_slide;
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch;

		if (distance < s_switch) {
			// a_slide/2 * t^2 + v_current * t - distance = 0
			let t_result = MathUtil.solveSq(a_slide / 2, v_current, -distance + epsilon)[0];
			return t_result != undefined ? t_result : Infinity;
		}
	} else {
		t_switch = 0;
		s_switch = 0;
		v_switch = v_current;
	}

	let s_roll = distance - s_switch;
	// a_roll/2 * t^2 + v_switch * t - s_roll = 0
	let t_roll = MathUtil.solveSq(a_roll / 2, v_switch, -s_roll + epsilon)[0];
	let rollTime = t_roll != undefined ? t_roll : Infinity;

	let t_result = t_switch + rollTime;
	return t_result;
}

/**
 * Estimates the time the ball needs to travel to a given position
 * checks if the position lies in front of the ball +- 90 degrees
 * if the pos is behind the ball, negative infinity is returned
 */
export function checkedBallRollTime(ball: BallLike, pos: Position): number {
	let toPos = pos - ball.pos;
	if (ball.speed.dot(toPos) > 0) {
		let distance = ball.pos.distanceTo(pos);
		return ballRollTime(ball, distance);
	}
	return -Infinity;
}


/**
 * Calculates the time the ball needs to fully stop
 * @param ball - A ball-like structure
 * @returns The estimated stop time
 */
export function ballStopTime(ball: {speed: Speed, maxSpeed: number}): number {
	// a_slide: the negative acceleration while the ball is sliding [m/s^2]
	// a_roll: the negative acceleration while the ball is rolling [m/s^2]
	let a_slide = Constants.fastBallDeceleration;
	let a_roll = Constants.ballDeceleration;

	// v_max: the speed at which the ball was shot [m/s]
	// v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	// v_current: the speed of the ball, now [m/s]
	let v_max = ball.maxSpeed;
	let v_switch = Constants.ballSwitchRatio * v_max;
	let v_current = ball.speed.length();

	let t_slide = 0;
	let v_roll = v_current;
	if (v_current > v_switch) {
		t_slide = (v_switch - v_current) / a_slide;
		v_roll = v_switch;
	}

	let t_roll = (0 - v_roll) / a_roll;

	return t_slide + t_roll;
}

/**
 * Calculates the time the ball needs to cross the field border
 * @param ball - A ball-like structure
 * @param offset - Additional offset to move field lines further outwards
 * @returns The estimated out time
 */
function _ballOutTime(ball: BallLike, offset?: number): number {
	if (ball.speed.length() < 0.01) {
		return Infinity;
	}
	let lineCut = Field.nextLineCut(ball.pos, ball.speed, offset);
	if (lineCut == undefined) {
		return Infinity;
	}
	let distToLine = ball.pos.distanceTo(lineCut);
	return ballRollTime(ball, distToLine);
}
export const ballOutTime: ((ball: BallLike, offset?: number) => number) = Cache.forFrame(_ballOutTime);


/**
 * First position where the ball will hit the ground again
 * @param ball - A ball-like structure
 * @returns The estimated landing position
 */
export function ballLandPos(ball: BallLike & {speedZ: number, posZ: number}): Position {
	let topHeight = Math.max(0, ball.posZ + ball.speedZ * ball.speedZ / (2 * 9.81));
	let timeToTop = ball.speedZ / 9.81;
	let timeToFloor = Math.sqrt(2 * topHeight / 9.81);

	let remainingFlightTime = Math.max(0, timeToTop + timeToFloor);
	return ball.pos + ball.speed * remainingFlightTime;
}

export interface RobotLike {
	pos: Position;
	speed: Speed;
	maxSpeed: number;
	acceleration: RobotAccelerationProfile; // for now
}


/** Assumes that the path is a direct line from robot.pos to endPos */
export function robotTimeToPos(robot: RobotLike, endPos: Position, endSpeedVector: Speed): [number, number] { // , debugFlag)
	// acceleration parameters
	let hardBrakeAccel = 4.7;
	let brakeAccelFactor = 1;
	let speedupAccelFactor = 1;

	// corridor width
	let maxError = 0.001;

	// retrieve parameters given via the robot object
	let startPos = robot.pos;
	let startSpeed = robot.speed;
	let maxSpeed = robot.maxSpeed;
	let accelerationProfile = robot.acceleration;

	// ignore direction of endSpeed
	let endSpeed = endSpeedVector.length();

	// retrieve acceleration values
	let brakeAccel = accelerationProfile.aBrakeFMax * brakeAccelFactor;
	let speedupAccel = accelerationProfile.aSpeedupFMax * speedupAccelFactor;

	// init current state
	let currentTime = 0;
	let currentSpeed = startSpeed.length();
	let currentPos = startPos;

	if (startPos === endPos && currentSpeed <= endSpeed) {
		return [0, 0];
	}

	// given currentSpeed, currentPos, endPos and corridorWidth calculate a curve.
	// the curve has to stay in the corridor, while being as fast as possible.
	let rawAngleDiff = (endPos - startPos).absoluteAngleDiff(startSpeed);
	let absAngleDiff = Math.min(Math.abs(rawAngleDiff), Math.PI - 0.001);

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
	let angleSin = Math.sin((Math.PI - absAngleDiff) / 2);
	let radius = maxError * angleSin / (1 - angleSin) * 0.5;


	let maxCurveSpeed = Math.sqrt(hardBrakeAccel * radius);
	if (maxCurveSpeed > currentSpeed) {
		radius = currentSpeed * currentSpeed / hardBrakeAccel;
		maxCurveSpeed = currentSpeed;
	}

	// check if brake and return is necessary (BAT)
	if (endSpeed < currentSpeed) {
		let BATspeedDiff = currentSpeed - endSpeed;
		let BATtime = BATspeedDiff / hardBrakeAccel;
		let BATdist = 0.5 * hardBrakeAccel * BATtime * BATtime + endSpeed * BATtime;
		if (BATdist > endPos.distanceTo(startPos)) {
			radius = 0;
			maxCurveSpeed = 0.001;
		}
	}

	// TODO: model system delay
	// local reactionTime = 0
	// local reactionDist = reactionTime * currentSpeed
	// local reactionPathVec = startSpeed.withLength(reactionDist)
	// currentTime = currentTime + reactionTime
	// currentPos = currentPos + reactionPathVec

	maxCurveSpeed = Math.min(maxCurveSpeed, currentSpeed);

	// we need to brake down to maxCurveSpeed
	if (currentSpeed > maxCurveSpeed) {
		let brakeTime = (currentSpeed - maxCurveSpeed) / hardBrakeAccel;
		let brakeDist = 0.5 * hardBrakeAccel * brakeTime * brakeTime + maxCurveSpeed * brakeTime;
		let linearPathVec = startSpeed.withLength(brakeDist);

		let curveDist = absAngleDiff * radius;
		let curveTime = curveDist / maxCurveSpeed;

		currentTime = brakeTime + curveTime;
		currentSpeed = maxCurveSpeed;


		let curvePathVec = new Vector(Math.sin(rawAngleDiff), Math.cos(rawAngleDiff) - 1) * radius;
		curvePathVec.rotate(startSpeed.angle());
		currentPos = currentPos + linearPathVec + curvePathVec;
	}

	// the remaining trajectory is a simple 1D line
	let remainingDist = currentPos.distanceTo(endPos);
	let expBrakeExtraTime = 0.04;

	let linearAccelTime = (maxSpeed - currentSpeed) / speedupAccel;
	let linearBrakeTime = (maxSpeed - endSpeed) / brakeAccel;
	let linearAccelDist = 0.5 * speedupAccel * linearAccelTime * linearAccelTime + currentSpeed * linearAccelTime;
	let linearBrakeDist = 0.5 * brakeAccel * linearBrakeTime * linearBrakeTime + endSpeed * linearBrakeTime;

	// case 1: robot reaches maxSpeed
	let maxSpeedDist = remainingDist - linearAccelDist - linearBrakeDist;
	if (maxSpeedDist >= 0) {
		let maxSpeedTime = maxSpeedDist / maxSpeed;
		return [currentTime + linearAccelTime + maxSpeedTime + linearBrakeTime + expBrakeExtraTime, currentTime];
	}

	// case 2: robot has to brake immediately
	if (currentSpeed > endSpeed) {
		let slowBrakeTime = (currentSpeed - endSpeed) / brakeAccel;
		let slowBrakeDist = 0.5 * brakeAccel * slowBrakeTime * slowBrakeTime + endSpeed * slowBrakeTime;
		if (slowBrakeDist > remainingDist) {
			let speedDiff = endSpeed - currentSpeed;
			let immediateBrakeAccel = (0.5 * speedDiff * speedDiff + currentSpeed * speedDiff) / remainingDist;
			let immediateBrakeTime = speedDiff / immediateBrakeAccel;
			return [currentTime + immediateBrakeTime + expBrakeExtraTime, currentTime];
		}
	}

	// case 3: robot cannot even reach endSpeed
	if (currentSpeed < endSpeed) {
		let slowAccelTime = (endSpeed - currentSpeed) / speedupAccel;
		let slowAccelDist = 0.5 * speedupAccel * slowAccelTime * slowAccelTime + currentSpeed * slowAccelTime;
		if (slowAccelDist > remainingDist) {
			let accelTime = (-currentSpeed + Math.sqrt(currentSpeed * currentSpeed + 2 * speedupAccel * remainingDist)) / speedupAccel;
			return [currentTime + accelTime, currentTime];
		}
	}

	// case 4: robot does not reach maxSpeed
	let speedDiff, accelDiff, minSpeed, plateauSpeed;
	if (endSpeed < currentSpeed) {
		speedDiff = currentSpeed - endSpeed;
		accelDiff = brakeAccel;
		minSpeed = endSpeed;
		plateauSpeed = currentSpeed;
	} else {
		speedDiff = endSpeed - currentSpeed;
		accelDiff = speedupAccel;
		minSpeed = currentSpeed;
		plateauSpeed = endSpeed;
	}
	let timeDiff = speedDiff / accelDiff;
	let distDiff = 0.5 * accelDiff * timeDiff * timeDiff + minSpeed * timeDiff;
	let distSym = Math.max(0, remainingDist - distDiff);

	let A = 0.5 * speedupAccel * brakeAccel / (speedupAccel + brakeAccel);
	let B = plateauSpeed;
	let C = -distSym;

	// A,distSym: positive
	let timeSym = MathUtil.solveSq(A, B, C)[0]!;

	return [currentTime + timeDiff + timeSym + expBrakeExtraTime, currentTime];
}

/**
 * Approximates the time the given robot needs to pos for a given endSpeed.
 * Uses a bang-bang motion profile
 * Calculations are done in 1D (along the line from robot.pos to pos)
 * @param robot
 * @param pos - The destination
 * @param endSpeed - The maximal velocity the robot is allowed to have in the given direction
 * @param brakeAndReturn - Setting this to true, the robot will brake to stop and return to pos, if it would be faster than endSpeed.
 * Warning! This can cause severe numerical instabilities if endSpeed points from robot.pos to pos and the robot is a bit too fast
 * Then the robot must do a full stop and return to pos with zero endSpeed!
 * @param lowAccel - Assume reduced acceleration
 * @returns The estimated time
 */
export function robotTimeToPosOLD(robot: Robot, pos: Position, endSpeed: Speed, brakeAndReturn: boolean, lowAccel: boolean): number {
	let accelerationFactor = lowAccel ? 0.7 : 0.7; // factor for max forward speedup and braking
	let tolerance = 0.01; // cutoff low distances to prevent instabilities
	// forward acceleration and deceleration
	let accelerate = Math.abs(robot.acceleration ? robot.acceleration.aSpeedupFMax : 1.0) * accelerationFactor;
	let brake = Math.abs(robot.acceleration ? robot.acceleration.aBrakeFMax : 1.0) * accelerationFactor;

	let lineDist = Math.max(pos.distanceTo(robot.pos) - tolerance, 0);
	let lineDir = (pos - robot.pos).normalized();
	let robotSpeed = Math.min(lineDir.dot(robot.speed), robot.maxSpeed);
	let destSpeed = Math.min(Math.max(0, lineDir.dot(endSpeed)), robot.maxSpeed);

	let accelTime = (robot.maxSpeed - robotSpeed) / accelerate;
	let brakeTime = (robot.maxSpeed - destSpeed) / brake;

	let accelDist = robotSpeed * accelTime + accelerate * accelTime * accelTime / 2;
	let brakeDist = destSpeed * brakeTime + brake * brakeTime * brakeTime / 2;

	let remainingDist = lineDist - accelDist - brakeDist;
	if (remainingDist >= 0) {
		// robot reaches full speed
		let maxSpeedTime = remainingDist / robot.maxSpeed;
		return accelTime + maxSpeedTime + brakeTime;
	} else {
		if (destSpeed >= robotSpeed) {
			let minAccelTime = (destSpeed - robotSpeed) / accelerate;
			let minAccelDist = robotSpeed * minAccelTime + accelerate * minAccelTime * minAccelTime / 2;
			if (minAccelDist >= lineDist) {
				// won't be able to reach endSpeed
				return (-robotSpeed + Math.sqrt(robotSpeed * robotSpeed + 2 * accelerate * lineDist)) / accelerate;
			}
		} else if (destSpeed <= robotSpeed) {
			let minBrakeTime = (robotSpeed - destSpeed) / brake;
			let minBrakeDist = destSpeed * minBrakeTime + brake * minBrakeTime * minBrakeTime / 2;
			if (minBrakeDist >= lineDist) {
				if (!brakeAndReturn) {
					// won't be able to brake down to endSpeed
					return (-robotSpeed + Math.sqrt(robotSpeed * robotSpeed - 2 * brake * lineDist)) / (-brake);
				}

				// create a fake robot at the position where the robot is able to brake
				let fakeRobot = {
					acceleration: robot.acceleration,
					pos: robot.pos + lineDir * minBrakeDist,
					maxSpeed: robot.maxSpeed,
					speed: new Vector(0, 0)
				};
				return minBrakeTime + robotTimeToPos(fakeRobot, pos, endSpeed)[0];
			}
		}

		// braking start before reaching full speed
		// symmetrically cut speed from maxspeed to lower speeds
		// d = v_max - v_cut
		// v_max(d/accel + d/brake)-accel/2*(d/accel)^2-brake/2*(d/brake)^2=-remaining
		// solve: d^2 * (-1/(2*accel)-1/(2*brake)) + d * v_max * (1/accel + 1/brake) + remaining = 0
		let [v_delta] = MathUtil.solveSq(-0.5 * (1 / accelerate + 1 / brake),
				robot.maxSpeed * (1 / accelerate + 1 / brake), remainingDist);
		if (v_delta == undefined) {
			// b^2 - 4*a*c < 0 -> rounding error
			v_delta = robot.maxSpeed;
		}
		accelTime = (robot.maxSpeed - v_delta - robotSpeed) / accelerate;
		brakeTime = (robot.maxSpeed - v_delta - destSpeed) / brake;
		return accelTime + brakeTime;
	}
}


/**
 * Calculates the min endspeed for the robot to reach pos in the given time
 * @param robot
 * @param pos
 * @param time
 * @returns The endspeed vector (in the direction from robot to pos)
 */
export function robotMinEndspeed(robot: Robot, pos: Position, time: number): Speed {
	let direction = (pos - robot.pos).normalized();
	let maxSpeed = robot.maxSpeed;

	// as slow as possible
	let minTime = robotTimeToPos(robot, pos, new Vector(0, 0))[0];
	if (minTime < time) {
		// the robot has more than enough time
		return new Vector(0, 0);
	}

	// as fast as possible
	let maxTime = robotTimeToPos(robot, pos, direction * maxSpeed)[0];
	if (maxTime > time) {
		// the robot cannot make it in time
		return direction * maxSpeed;
	}

	// binary search
	// resolution
	let epsilon_v = 0.05;

	let v = maxSpeed / 2;
	let delta_v = maxSpeed / 4;

	while (delta_v > epsilon_v) {
		let t = robotTimeToPos(robot, pos, direction * v)[0];
		if (t < time) {
			v = v - delta_v;
		} else {
			v = v + delta_v;
		}
		delta_v = delta_v / 2;
	}

	return direction * v;
}


/** Calculates the time the robot needs to move to the position next to the ball at given t_ball */
export function robotTimeForBallTime(robot: Robot, ball: BallLike & {radius: number}, targetPos: Position,
		endSpeedLength: number, t_ball: number): number {
	let x_ball = ballAtTime(ball, t_ball).pos;
	let axis = (x_ball - targetPos).normalized();
	let offset = axis * (ball.radius + robot.shootRadius);
	let x_robot = x_ball + offset;

	// anywhere on the dribbler is okay, not only the center
	let dribblerHalf = axis.perpendicular() * (-robot.dribblerWidth / 2);
	x_robot = robot.pos.nearestPosOnLine(x_robot + dribblerHalf, x_robot - dribblerHalf);

	// calculate and save the robot time
	let endSpeed = (x_robot - robot.pos).withLength(endSpeedLength);
	return robotTimeToPos(robot, x_robot, endSpeed)[0];
}

function dist(v0: number, v1: number, a: number): [number, number] {
	let t = Math.abs(v0 - v1) / a;
	return [(v0 + v1) * t / 2, t];
}

function angleForTime(accA: number, accB: number, time: number, startSpeed: number): number {
	// y1 = t * accA + startSpeed
	// y2 = (t - time) * -accB + endSpeed

	let t = (time * accB - startSpeed) / (accA + accB);
	let maxSpeed = t * accA + startSpeed;

	return dist(startSpeed, maxSpeed, accA)[0] + dist(maxSpeed, 0, accB)[0];
}


/**
 * Calculates the degrees that a robot can turn in a given timespan
 * @param robot
 * @param time - How much time (in seconds) the robot has to turn
 * @returns dist1 The angle the robot can turn clockwise
 * @returns dist2 The angle the robot can turn counter-clockwise
 */
export function robotRotationRangeForTime(robot: Robot, time: number): [number, number] {
	let angularSpeed = robot.angularSpeed;
	let maxAccel = robot.acceleration.aSpeedupPhiMax;
	let maxDecel = robot.acceleration.aBrakePhiMax;
	let [extraDist, brakeTime] = dist(angularSpeed, 0, maxDecel);

	let dist1 = angleForTime(maxAccel, maxDecel, time, Math.abs(angularSpeed));
	let dist2;
	if (brakeTime < time) {
		dist2 = angleForTime(maxAccel, maxDecel, time - brakeTime, 0) - extraDist;
	} else {
		let minEndSpeed = Math.abs(angularSpeed) - time * maxDecel;
		dist2 = -dist(Math.abs(angularSpeed), minEndSpeed, maxDecel)[0];
	}

	if (angularSpeed < 0) {
		return [dist1, dist2];
	} else {
		return [dist2, dist1];
	}
}

function rttbSpecialCases(robot: Robot, ball: BallLike & {radius: number}, targetPos: Position, endSpeedLength: number,
		t_max: number, t_out: number): [number | undefined, number | undefined] {
	// calculate time required when the robot is directly hit by the ball
	let frontOffset = (targetPos - robot.pos).withLength(ball.radius + robot.shootRadius);
	let [ballHitPos, _, lambda] = geom.intersectLineLine(ball.pos, ball.speed,
			robot.pos + frontOffset, ball.speed.perpendicular().normalized());
	let ballTimeToHitPos = ballRollTime(ball, ball.pos.distanceTo(ballHitPos!));
	let robotTimeToHitPos = robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, ballTimeToHitPos);

	// catch ball at nearest point on ball move line, if that's possible
	// this stabilizes the calculation if the ball is going to hit the robot soon
	// !!! optimistic: assumes that the robot can't be too fast to catch the ball
	if (robotTimeToHitPos <= ballTimeToHitPos) {
		t_max = Math.min(ballTimeToHitPos, t_max);
	}

	// Special case: Ball seems to be a bit inside the robot
	// This happens because the tracking doesn't implement a ball collision modell
	let relpos = (ball.pos - robot.pos).rotate(-robot.dir);
	relpos.x = relpos.x - robot.shootRadius - ball.radius;
	let sidewardsOffset = Math.abs(relpos.y);
	/* if (Roboobserver.touchedBall(robot, 0.15) && relpos.x > -0.25 && relpos.x <= 0.05 && sidewardsOffset < 0.2) {
		return [undefined, 0];
	}*/

	// special case: when the ball is fast and will soon hit the dribbler
	// just use the ballTimeToHitPos. This is necessary as the timespan during which
	// the t_ball > t_robot is getting smaller and smaller the distance between ball and robot gets
	// In the end the sampling is no longer able to find a valid time
	// The instability is increased as predicting the fasted position
	// where to catch the ball on the dribber gets more important.
	if (Math.abs(lambda!) < robot.dribblerWidth / 2 + 0.01 && ballTimeToHitPos < 0.25
			&&  ball.speed.dot(ballHitPos! - ball.pos) > 0) {
		if (ballTimeToHitPos <= t_max) {
			return [undefined, ballTimeToHitPos];
		} else {
			return [undefined, Infinity];
		}
	}

	// ball moves away from the robot
	if (t_out < Infinity && ball.speed.dot(ball.pos - robot.pos) > 0) {
		// try to catch the ball inside the field
		let robotTimeToBorder = robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_out);
		if (robotTimeToBorder > t_out) {
			return [undefined, Infinity];
		}
	}

	return [t_max, undefined];
}

function rttbQuadraticSampling(robot: Robot, ball: BallLike & {radius: number}, targetPos: Position, endSpeedLength: number,
		t_max: number, t_stop: number, t_out: number): [undefined, number] | [number, number | undefined] {
	const N_SAMPLES = 10;

	let robot_times: number[] = [];
	let ball_times: number[] = [];

	for (let i = 0;i < N_SAMPLES;i++) {
		// calculate interval
		let i_normalized = i / (N_SAMPLES - 1);
		let step_quadratic = 0.5 * i_normalized * i_normalized + 0.5 * i_normalized;
		let t_ball = step_quadratic * t_max;
		let t_robot = robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball);
		ball_times.push(t_ball);
		robot_times.push(t_robot);
	}

	// the curve of (t_robot - t_ball) has up to 2 maxima
	// the first one occurs at the point where the robot actively catches the ball
	// the second one is the point where the robot moves to the slow or resting ball
	// check if the first maximum is > 0 (if it exists)
	let t_ball_bsearch_start = undefined;
	let t_ball_bsearch_end = undefined;
	for (let i = 1;i < N_SAMPLES;i++) {
		// search the first zero crossing
		let timediff0 = ball_times[i - 1] - robot_times[i - 1];
		let timediff1 = ball_times[i] - robot_times[i];
		if (timediff0 <= 0 && timediff1 >= 0) {
			t_ball_bsearch_start = ball_times[i - 1];
			t_ball_bsearch_end = ball_times[i];
			break;
		}
	}

	// if the robot is always slower than the ball
	// either return the time to the stationary ball
	// or if the ball is too fast, the robot cannot catch it at all
	if (t_ball_bsearch_start == undefined) {
		if (t_stop < t_out) {
			return [undefined, robot_times[N_SAMPLES - 1]];
		} else {
			return [undefined, Infinity];
		}
	}
	return [t_ball_bsearch_start, t_ball_bsearch_end];
}

function rttbBinarySearch(robot: Robot, ball: BallLike & {radius: number}, targetPos: Position, endSpeedLength: number,
		t_ball_bsearch_start: number, t_ball_bsearch_end: number): number {
	if (t_ball_bsearch_start < 0 || t_ball_bsearch_end < t_ball_bsearch_start) {
		throw new Error("");
	}
	// time resolution, for a ball with 5m/s, the error may be up to 1 cm
	let epsilon_t = 0.002;

	// initialize binary search variables
	let delta_t = (t_ball_bsearch_end - t_ball_bsearch_start) / 4;
	let t_ball = t_ball_bsearch_start + delta_t * 2;

	// search for optimal time
	while (delta_t > epsilon_t) {
		let t_robot = robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball);

		// update search interval
		if (t_robot > t_ball) {
			t_ball = t_ball + delta_t;
		} else {
			t_ball = t_ball - delta_t;
		}
		delta_t = delta_t / 2;
	}
	return t_ball;
}


/**
 * Calculates the time the robot takes to reach the ball (in a controlled fashion)
 * @param robot - The robot
 * @param ball - A ball-like structure
 * @param targetPos - The position the robot will look at
 * @param endSpeedLength - The maximal velocity of the robot when reaching the destination
 * @param lastTime - Last result of robotTimeToBall for the given parameters
 * @returns The estimated time
 */
export function robotTimeToBall(robot: Robot, ball: BallLike & {radius: number}, targetPos: Position,
		endSpeedLength: number, lastTime?: number): number {
	// local time0 = amun.getCurrentTime()
	// if the ball is extremely slow, consider it as stationary
	if (ball.speed.length() < 0.01) {
		let result = robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, 0);
		// local time1 = amun.getCurrentTime()
		// plot.aggregate("robotTimeToBall", time1 - time0)
		return result;
	}

	// calculate the time the ball needs to cross the field border
	let t_out = ballOutTime(ball);
	// calculate the time until the ball stops
	let t_stop = ballStopTime(ball);
	// upper bound for sampling and binary search
	let t_max = Math.min(t_out, t_stop);

	let specialCaseResult: number | undefined;
	[t_max, specialCaseResult] = <[number, any]> rttbSpecialCases(robot, ball, targetPos, endSpeedLength, t_max, t_out);
	if (specialCaseResult != undefined) {
		// local time1 = amun.getCurrentTime()
		// plot.aggregate("robotTimeToBall", time1 - time0)
		return specialCaseResult;
	}

	let t_ball_bsearch_start, t_ball_bsearch_end;
	if (lastTime != undefined && lastTime < Infinity && lastTime > 0) {
		// try to reuse the sample from last frame
		let t_ball1 = Math.max(0, lastTime - World.TimeDiff - 0.035);
		let t_diff1 = t_ball1 - robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball1);
		let t_ball2 = lastTime;
		let t_diff2 = t_ball2 - robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball2);

		if (t_diff1 <= 0 && t_diff2 >= 0) {
			t_ball_bsearch_start = t_ball1;
			t_ball_bsearch_end = t_ball2;
		} else if (t_diff1 >= 0) {
			t_ball_bsearch_start = 0;
			t_ball_bsearch_end = t_ball1;
		}
	}

	if (t_ball_bsearch_start == undefined) {
		[t_ball_bsearch_start, t_ball_bsearch_end]
				= rttbQuadraticSampling(robot, ball, targetPos, endSpeedLength, t_max, t_stop, t_out);

		if (t_ball_bsearch_start == undefined) {
			// local time1 = amun.getCurrentTime()
			// plot.aggregate("robotTimeToBall", time1 - time0)
			return <number> t_ball_bsearch_end;
		}
	}

	let t_ball = rttbBinarySearch(robot, ball, targetPos, endSpeedLength,
			t_ball_bsearch_start, <number> t_ball_bsearch_end);
	// local time1 = amun.getCurrentTime()
	// plot.aggregate("robotTimeToBall", time1 - time0)
	return t_ball;
}
