import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as Referee from "base/referee";
import { FriendlyRobot, Robot } from "base/robot";
import { RelTime } from "base/timing";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as ObserverBall from "glados/observer/ball";
import * as Physics from "glados/observer/physics";

export interface RobotDynamics {
	maxSpeed: number;
	maxAngularSpeed: number;
	acceleration: {
		aSpeedupFMax: number;
		aBrakeFMax: number;
		aSpeedupSMax: number;
		aBrakeSMax: number;
		aSpeedupPhiMax: number;
		aBrakePhiMax: number;
	};
}


let lastLocalSpeed: Map<Robot, Speed> = new Map<Robot, Speed>();
let lastRotation: Map<Robot, number> = new Map<Robot, number>();
let speedSmoothed: Map<Robot, number> = new Map<Robot, number>();
let rotationSmoothed: Map<Robot, number> = new Map<Robot, number>();
let rotationAcclerationSmoothed: Map<Robot, number> = new Map<Robot, number>();
let accelerationSmoothed: Map<Robot, Vector> = new Map<Robot, Vector>();
let alpha = 0.02;
let opponentDynamics: RobotDynamics = {
	maxSpeed: 0,
	maxAngularSpeed: 0,
	acceleration: {
		aSpeedupFMax: 0,
		aBrakeFMax: 0,
		aSpeedupSMax: 0,
		aBrakeSMax: 0,
		aSpeedupPhiMax: 0,
		aBrakePhiMax: 0,
	}
};
let friendlyDynamics: RobotDynamics = { ...opponentDynamics };
friendlyDynamics.acceleration = { ...friendlyDynamics.acceleration };

export function estimateRobotDynamics() {
	if (World.TimeDiff < 0.001) {
		// don't do anything if the timediff is far below the regular 10 ms
		return;
	}

	let nullVector = new Vector(0, 0);
	let invTimeDiff = (1 / World.TimeDiff);
	let currentLocalSpeed: Map<Robot, Speed> = new Map<Robot, Speed>();
	let currentRotation: Map<Robot, number> = new Map<Robot, number>();

	for (let robot of World.Robots) {
		let thisRobotSpeed = robot.speed.rotated(-robot.dir);
		thisRobotSpeed = new Vector(Math.abs(thisRobotSpeed.x), Math.abs(thisRobotSpeed.y));
		let letRobotDir = Math.abs(robot.angularSpeed);
		if (lastLocalSpeed.has(robot)) {
			let accel = (thisRobotSpeed - <Speed> lastLocalSpeed.get(robot)) * invTimeDiff; // classic derivative without smoothing
			accelerationSmoothed.set(robot, accel * alpha + (accelerationSmoothed.get(robot) || nullVector) * (1 - alpha)); // smoothed acceleration curve
		}
		if (lastRotation.has(robot)) {
			let accel = (letRobotDir - <number> lastRotation.get(robot)) * invTimeDiff;
			rotationAcclerationSmoothed.set(robot, accel * alpha + (rotationAcclerationSmoothed.get(robot) || 0) * (1 - alpha));
		}
		speedSmoothed.set(robot, robot.speed.length() * alpha + (speedSmoothed.get(robot) || 0) * (1 - alpha));
		rotationSmoothed.set(robot, letRobotDir * alpha + (rotationSmoothed.get(robot) || 0) * (1 - alpha));
		currentLocalSpeed.set(robot, thisRobotSpeed);
		currentRotation.set(robot, letRobotDir);

		let dynamics = robot.isFriendly ? friendlyDynamics : opponentDynamics;

		if (accelerationSmoothed.has(robot)) {
			let accel = accelerationSmoothed.get(robot) as Vector;
			if (accel.x > 0 && accel.x > dynamics.acceleration.aSpeedupFMax) {
				dynamics.acceleration.aSpeedupFMax = accel.x;
			}
			if (accel.x < 0 && -accel.x > dynamics.acceleration.aBrakeFMax) {
				dynamics.acceleration.aBrakeFMax = -accel.x;
			}
			if (accel.y > 0 && accel.y > dynamics.acceleration.aSpeedupSMax) {
				dynamics.acceleration.aSpeedupSMax = accel.y;
			}
			if (accel.y < 0 && -accel.y > dynamics.acceleration.aBrakeSMax) {
				dynamics.acceleration.aBrakeSMax = -accel.y;
			}
		}
		if (rotationAcclerationSmoothed.has(robot)) {
			let rot = rotationAcclerationSmoothed.get(robot) as number;
			if (rot > 0 && rot > dynamics.acceleration.aSpeedupPhiMax) {
				dynamics.acceleration.aSpeedupPhiMax = rot;
			}
			if (rot < 0 && -rot > dynamics.acceleration.aBrakePhiMax) {
				dynamics.acceleration.aBrakePhiMax = -rot;
			}
		}
		if (dynamics.maxSpeed < <number> speedSmoothed.get(robot)) {
			dynamics.maxSpeed = <number> speedSmoothed.get(robot);
		}
		if (dynamics.maxAngularSpeed < <number> rotationSmoothed.get(robot)) {
			dynamics.maxAngularSpeed = <number> rotationSmoothed.get(robot);
		}
	}

	lastLocalSpeed = currentLocalSpeed;
	lastRotation = currentRotation;
}

export function getFriendlyDynamics(): RobotDynamics {
	return friendlyDynamics;
}

export function getOpponentDynamics(): RobotDynamics {
	return opponentDynamics;
}

let hadBallTimes: Map<Robot, number> = new Map<Robot, number>();
let inverseHadBallTimes: Map<Robot, number> = new Map<Robot, number>();

// Robot.hadBall(this._robot, 0) is equivalent to this._robot:hasBall(World.Ball)
export function hadBall(robot: Robot, time: number): boolean {
	return hadBallTimes.has(robot) && World.Time - <number> hadBallTimes.get(robot) <= time;
}

// returns true if the robot has the ball for at least <time> seconds, continuously
export function controlsBall(robot: Robot, time: number): boolean {
	return inverseHadBallTimes.has(robot) && World.Time - <number> inverseHadBallTimes.get(robot) >= time;
}

function updateHadBall() {
	for (let r of World.Robots) {
		if (r.hasBall(World.Ball)) {
			hadBallTimes.set(r, World.Time);
			vis.addCircle("o/robot: hasBall", r.pos, 0.15,
				vis.fromRGBA(127, 191, 255, 63), true, true);
		} else {
			inverseHadBallTimes.set(r, World.Time);
		}
	}
}

let touchedByBall: Map<Robot, number> = new Map<Robot, number>();
export function touchedBall(robot: Robot, time: number): boolean {
	return touchedByBall.has(robot) && World.Time - <number> touchedByBall.get(robot) <= time;
}

function updateTouchedBall() {
	for (let r of World.Robots) {
		let touchDist = World.Ball.radius + Constants.positionError + r.radius;
		if (r.pos.distanceToSq(World.Ball.pos) < touchDist * touchDist) {
			touchedByBall.set(r, World.Time);
		}
	}
}


let _minTimeToBall: Map<Robot, number> = new Map<Robot, number>();
let _oldMinTimeToBall: Map<Robot, number> = new Map<Robot, number>();
function resetMinTimeToBall() {
	_oldMinTimeToBall = _minTimeToBall;
	_minTimeToBall = new Map<Robot, number>();
}

export function minTimeToBall(robot: Robot): number {
	if (_minTimeToBall.has(robot)) {
		return <number> _minTimeToBall.get(robot);
	}

	let targetPos = robot.isFriendly ? World.Geometry.OpponentGoal : World.Geometry.FriendlyGoal;
	_minTimeToBall.set(robot, Physics.robotTimeToBall(robot, World.Ball, targetPos, robot.maxSpeed, _oldMinTimeToBall.get(robot)));
	return <number> _minTimeToBall.get(robot);
}

let _minTimeToBallNoTarget: Map<Robot, number> = new Map<Robot, number>();
let _oldMinTimeToBallNoTarget: Map<Robot, number> = new Map<Robot, number>();
function resetMinTimeToBallNoTarget() {
	_oldMinTimeToBallNoTarget = _minTimeToBallNoTarget;
	_minTimeToBallNoTarget = new Map<Robot, number>();
}

export function minTimeToBallNoTarget(robot: Robot): RelTime {
	if (_minTimeToBallNoTarget.has(robot)) {
		return <number> _minTimeToBallNoTarget.get(robot);
	}
	_minTimeToBallNoTarget.set(robot, Physics.robotTimeToBall(robot, World.Ball, undefined, robot.maxSpeed, _oldMinTimeToBallNoTarget.get(robot)));
	return <number> _minTimeToBallNoTarget.get(robot);
}

// WARNING: this function can return Infinity when the ball can't be reached inside the field
let previousMinShootTimes: Map<Robot, number> = new Map<Robot, number>();
function _minShootTime(robot: Robot, shootPos: Position): number {
	let minDelay = 0.1;
	let prevTime = previousMinShootTimes.get(robot);
	let time;
	if (hadBall(robot, 0)) {
		time = minDelay;
	} else {
		time = Math.max(minDelay, Physics.robotTimeToBall(robot, World.Ball,
			shootPos, robot.maxSpeed, prevTime));
	}
	previousMinShootTimes.set(robot, time);
	return time;
}
export let minShootTime: (robot: Robot, shootPos: Position) => number = Cache.forFrame(_minShootTime);

function isBallClose(robot: Robot) {
	const BAL_CLOSE_DIST = robot.radius + World.Ball.radius + 0.05;
	return robot.pos.distanceToSq(World.Ball.pos) < BAL_CLOSE_DIST * BAL_CLOSE_DIST;
}

let standardShooterRobot: Robot | undefined = undefined;
function updateOwnStandardShooter() {
	if (Referee.isFriendlyFreeKickState() || World.RefereeState === "KickoffOffensive") {
		if (!standardShooterRobot || !isBallClose(standardShooterRobot)) {
			for (let robot of World.FriendlyRobots) {
				if (isBallClose(robot)) {
					standardShooterRobot = robot;
					break;
				}
			}
		}
	} else if (World.RefereeState === "Game" && standardShooterRobot) {
		// reset when any other robot touches the ball
		for (let robot of World.Robots) {
			if (robot !== standardShooterRobot && touchedBall(robot, 0)) {
				standardShooterRobot = undefined;
			}
		}
	} else {
		// reset in any other states
		standardShooterRobot = undefined;
	}
}

export function ownStandardShooter(): Robot | undefined {
	if (World.RefereeState === "Game") {
		return standardShooterRobot;
	} else {
		return undefined;
	}
}

let _doubleTouchingRobot: Robot | undefined = undefined;
// prevents freekicking robot from moving away after failed shot
let lastFreekickTime = 1;
function updateDoubleTouchingRobot() {
	if (Referee.isFriendlyFreeKickState()) {
		// subtract half a second to ensure that the freekick shot gets detected
		lastFreekickTime = World.Time - 0.5;
	}

	const wasShot = ObserverBall.wasShot(World.Time - lastFreekickTime) !== undefined;
	_doubleTouchingRobot = World.RefereeState === "Game" && !wasShot
		? ownStandardShooter()
		: undefined;

	debug.pushtop("ObserverRobot");
	debug.push("doubleTouchingRobot");
	debug.set(undefined, _doubleTouchingRobot);
	debug.set("lastFreekickTime", lastFreekickTime);
	debug.set("wasShot", wasShot);
	debug.pop(); // doubleTouchingRobot
	debug.pop(); // ObserverRobot
}

/**
 * Find the robot in danger of commiting double touch. Only detects friendly
 * robots.
 * @returns a robot that is in danger of commiting double touch or undefined if no such robot exists
 */
export function doubleTouchingRobot(): Robot | undefined {
	return _doubleTouchingRobot;
}


const _dribblingStart = new Map<FriendlyRobot, Position | undefined>();
function updateDribblingStart() {
	for (const robot of World.FriendlyRobots) {
		const hysteresis = _dribblingStart[robot]
			? 0.25 * World.Ball.radius : 0;

		const ballDist = robot.pos.distanceTo(World.Ball.pos);
		const dribbling = ballDist < robot.radius + World.Ball.radius + hysteresis;

		if (dribbling && !_dribblingStart[robot]) {
			_dribblingStart[robot] = World.Ball.pos;
		} else if (!dribbling) {
			_dribblingStart.delete(robot);
		}
	}
}

/**
 * Returns the position of the ball at the time a robot started dribbling. As
 * per the rules, dribbling distance is measured according to the ball
 * position.
 *
 * @param robot - The robot to check. For now, only friendly robots are measured
 * @returns The position of the ball at the time robot started dribbling
 */
export function dribblingStartFor(robot: FriendlyRobot): Position | undefined {
	return _dribblingStart[robot];
}

function calculateWayForPosition(pos: Position, radius: number, friendly: boolean): number {
	let goal = friendly ? World.Geometry.FriendlyGoal : World.Geometry.OpponentGoal;
	if (Math.abs(pos.y) > World.Geometry.FieldHeightHalf) {
		if (pos.x * pos.y > 0) {
			return 0;
		} else {
			return Field.maxWay(radius);
		}
	}
	return Field.intersectRayDefenseArea(goal, pos - goal, radius, friendly, true)[1]!;
}

// calculates the time a robot needs around the defense area
// if robotway is set it has to be the way of the intersection of robot.pos with
// the defense area in the direction of the goal with the given radius
// this function does not make sense when either robot.pos or targetPos are far away from the defense area
// either targetPos or targetWay is optional, but one of the two has to be given
// endSpeed is a number
export function timeAroundDefenseAreaByWay(robot: Robot, robotWay: number | undefined, targetPos: Position,
		targetWay: undefined, radius: number, friendly: boolean, endSpeed?: number): number;
export function timeAroundDefenseAreaByWay(robot: Robot, robotWay: number | undefined, targetPos: undefined,
		targetWay: number, radius: number, friendly: boolean, endSpeed?: number): number;
export function timeAroundDefenseAreaByWay(robot: Robot, robotWay: number | undefined, targetPos: Position,
		targetWay: number, radius: number, friendly: boolean, endSpeed?: number): number;
export function timeAroundDefenseAreaByWay(robot: Robot, robotWay: number | undefined, targetPos: Position | undefined,
		targetWay: number | undefined, radius: number, friendly: boolean, endSpeed?: number): number {
	if (robotWay == undefined) {
		robotWay = calculateWayForPosition(robot.pos, radius, friendly);
	}
	if (targetPos == undefined) {
		targetPos = Field.defenseIntersectionByWay(<number> targetWay, radius, friendly);
	} else if (targetWay == undefined) {
		targetWay = calculateWayForPosition(targetPos, radius, friendly);
	}
	let drivePoints = Field.cornerPointsBetweenWays(robotWay, <number> targetWay, radius, friendly);
	drivePoints.unshift(robot.pos);
	drivePoints.push(<Position> targetPos);
	let totalTime = 0;
	let fakeRobot = { speed: robot.speed, maxSpeed: robot.maxSpeed, acceleration: robot.acceleration, pos: robot.pos };
	for (let i = 1; i < drivePoints.length; i++) {
		fakeRobot.pos = drivePoints[i - 1];
		let es = new Vector(0, 0);
		if (i === drivePoints.length - 1 && endSpeed != undefined) {
			es = new Vector(endSpeed, 0);
		}
		totalTime = totalTime + Physics.robotTimeToPos(fakeRobot, drivePoints[i], es)[0];
		fakeRobot.speed = new Vector(0, 0);
	}
	return totalTime;
}


/**
 * Determine the positions of the edges of a robots dribbler
 * @returns a [Position, Position] tuple where the element one is the position
 *          of the right edge and element two is the position of the left edge
 *
 * Sidenote: This would be a good candidate for named tuple types available in
 * TS 4.0 and later
 */
export function getDribblerEdges(robot: Pick<Robot, "dir" | "dribblerWidth" | "dribblerPos">): [Position, Position] {
	const toEdge = Vector.fromPolar(robot.dir - Math.PI / 2, robot.dribblerWidth / 2);
	return [
		robot.dribblerPos + toEdge,
		robot.dribblerPos - toEdge,
	];
}


function _isPressed(robot: Robot, attackPos?: Position): boolean {
	if (!Referee.isGameState()) {
		return false;
	}
	let directionOffset = (World.Geometry.OpponentGoal - robot.pos).withLength(robot.shootRadius + World.Ball.radius);
	let ballPos = attackPos || robot.pos + directionOffset;
	let blockPos = ballPos + directionOffset;

	let radius = 2.5;
	for (let opp of World.OpponentRobots) {
		if (opp.pos.distanceToSq(blockPos) < radius * radius
				&& Physics.robotTimeToPos(opp, blockPos, new Vector(0, 0))[0] < 1) {
			return true;
		}
	}
	return false;
}
export let isPressed: (robot: Robot, attackPos?: Position) => boolean = Cache.forFrame(_isPressed);

export function _update() {
	resetMinTimeToBall();
	resetMinTimeToBallNoTarget();
	updateHadBall();
	updateTouchedBall();
	updateOwnStandardShooter();
	debug.set("ownStandardShooter", ownStandardShooter());
	// Needs to be called after updateOwnStandardShooter() since it uses
	// ownStandardShooter() for detection
	updateDoubleTouchingRobot();
	updateDribblingStart();
}
