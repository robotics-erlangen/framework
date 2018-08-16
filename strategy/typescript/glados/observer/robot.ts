import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as Field from "base/field";
import * as Referee from "base/referee";
import {Vector, Position} from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
import * as Physics from "glados/observer/physics";

export interface RobotDynamics {
	maxSpeed: number,
	maxAngularSpeed: number,
	acceleration: {
		aSpeedupFMax: number,
		aBrakeFMax: number,
		aSpeedupSMax: number,
		aBrakeSMax: number,
		aSpeedupPhiMax: number,
		aBrakePhiMax: number,
	}
}


let lastLocalSpeed: Map<Robot, number> = new Map<Robot, number>();
let lastRotation: Map<Robot, number> = new Map<Robot, number>();
let speedSmoothed: Map<Robot, number> = new Map<Robot, number>();
let rotationSmoothed: Map<Robot, number> = new Map<Robot, number>();
let rotationAcclerationSmoothed: Map<Robot, number> = new Map<Robot, number>();
let accelerationSmoothed: Map<Robot, number> = new Map<Robot, number>();
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
let friendlyDynamics: RobotDynamics = {...opponentDynamics};
friendlyDynamics.acceleration = {...friendlyDynamics.acceleration};

export function estimateRobotDynamics () {
	if (World.TimeDiff < 0.001) {
		// don't do anything if the timediff is far below the regular 10 ms
		return;
	}

	let nullVector = new Vector(0,0);
	let invTimeDiff = (1 / World.TimeDiff);
	let currentLocalSpeed = {};
	let currentRotation = {};

	for (let robot of World.Robots) {
		let letRobotSpeed = robot.speed.copy().rotate(-robot.dir);
		letRobotSpeed.x = Math.abs(letRobotSpeed.x);
		letRobotSpeed.y = Math.abs(letRobotSpeed.y);
		let letRobotDir = Math.abs(robot.angularSpeed);
		if (lastLocalSpeed.has(robot)) {
			let accel = (letRobotSpeed - lastLocalSpeed.get(robot)).scaleLength(invTimeDiff);  // classic derivative without smoothing
			accelerationSmoothed.set(robot, accel.scaleLength(alpha) + (accelerationSmoothed.get(robot) || nullVector) * (1 - alpha)); // smoothed acceleration curve
		}
		if (lastRotation.has(robot)) {
			let accel = (letRobotDir - lastRotation.get(robot)) * invTimeDiff;
			rotationAcclerationSmoothed.set(robot, accel * alpha + (rotationAcclerationSmoothed.get(robot) || 0) * (1 - alpha));
		}
		speedSmoothed.set(robot, robot.speed.length() * alpha + (speedSmoothed.get(robot) || 0) * (1 - alpha));
		rotationSmoothed.set(robot, letRobotDir * alpha + (rotationSmoothed.get(robot) || 0) * (1 - alpha));
		currentLocalSpeed.set(robot, letRobotSpeed);
		currentRotation.set(robot, letRobotDir);

		let dynamics = robot.isFriendly ? friendlyDynamics : opponentDynamics;

		if (accelerationSmoothed.has(robot)) {
			let accel = accelerationSmoothed.get(robot);
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
			let rot = rotationAcclerationSmoothed.get(robot);
			if (rot > 0 && rot > dynamics.acceleration.aSpeedupPhiMax) {
				dynamics.acceleration.aSpeedupPhiMax = rot;
			}
			if (rot < 0 && -rot > dynamics.acceleration.aBrakePhiMax) {
				dynamics.acceleration.aBrakePhiMax = -rot;
			}
		}
		if (dynamics.maxSpeed < speedSmoothed.get(robot)) {
			dynamics.maxSpeed = speedSmoothed.get(robot);
		}
		if (dynamics.maxAngularSpeed < rotationSmoothed.get(robot)) {
			dynamics.maxAngularSpeed = rotationSmoothed.get(robot);
		}
	}

	lastLocalSpeed = currentLocalSpeed;
	lastRotation = currentRotation;
}

export function getFriendlyDynamics (): RobotDynamics {
	return friendlyDynamics;
}

export function getOpponentDynamics (): RobotDynamics {
	return opponentDynamics;
}

let hadBallTimes: Map<Robot, number> = new Map<Robot, number>();
let inverseHadBallTimes: Map<Robot, number> = new Map<Robot, number>();

// Robot.hadBall(self._robot, 0) is equivalent to self._robot:hasBall(World.Ball)
export function hadBall (robot: Robot, time: number): boolean {
	return hadBallTimes.has(robot) && World.Time - hadBallTimes.get(robot) <= time;
}

// returns true if the robot has the ball for at least <time> seconds, continuously
export function controlsBall (robot: Robot, time: number): boolean {
	return inverseHadBallTimes.has(robot) && World.Time - inverseHadBallTimes.get(robot) >= time;
}

function updateHadBall () {
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
export function touchedBall (robot: Robot, time: number): boolean {
	return touchedByBall.has(robot) && World.Time - touchedByBall.get(robot) <= time;
}

function updateTouchedBall () {
	for (let r of World.Robots) {
		let touchDist = World.Ball.radius + Constants.positionError + r.radius;
		if (r.pos.distanceToSq(World.Ball.pos) < touchDist * touchDist) {
			touchedByBall.set(r, World.Time);
		}
	}
}


let minTimeToBall: Map<Robot, number> = new Map<Robot, number>();
let oldMinTimeToBall: Map<Robot, number> = new Map<Robot, number>();
function resetMinTimeToBall () {
	oldMinTimeToBall = minTimeToBall;
	minTimeToBall = new Map<Robot, number>();
}

export function minTimeToBall (robot: Robot): number {
	if (minTimeToBall.has(robot)) {
		return minTimeToBall.get(robot);
	}

	let targetPos = robot.isFriendly ? World.Geometry.OpponentGoal : World.Geometry.FriendlyGoal;
	minTimeToBall.set(robot, Physics.robotTimeToBall(robot, World.Ball, targetPos, robot.maxSpeed, oldMinTimeToBall.get(robot)));
	return minTimeToBall.get(robot);
}

let previousMinShootTimes: Map<Robot, number> = new Map<Robot, number>();
export function minShootTime (robot: Robot, shootPos: Position): number {
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
Robot.minShootTime = Cache.forFrame(Robot.minShootTime);

let standardShooterRobot: Robot = undefined;
function updateOwnStandardShooter () {
	if (Referee.isFriendlyFreeKickState() || World.RefereeState === "KickoffOffensive") {
		if (!standardShooterRobot || !hadBall(standardShooterRobot, 0)) {
			for (let robot of World.FriendlyRobots) {
				if (hadBall(robot, 0)) {
					standardShooterRobot = robot;
					break;
				}
			}
		}
	} else if (World.RefereeState === "Game" && standardShooterRobot) {
		// reset when any other robot touches the ball
		for (let robot of World.Robots) {
			if (robot != standardShooterRobot && touchedBall(robot, 0)) {
				standardShooterRobot = undefined;
			}
		}
	} else {
		// reset in any other states
		standardShooterRobot = undefined;
	}
}

export function ownStandardShooter (): Robot | undefined {
	if (World.RefereeState === "Game") {
		return standardShooterRobot;
	} else {
		return undefined;
	}
}

function calculateWayForPosition (pos: Position, goal: Position, radius: number, friendly: boolean): number {
	if (pos.y < -World.Geometry.FieldHeightHalf) {
		if (pos.x < 0) {
			return 0;
		} else {
			return Field.maxWay(radius);
		}
	}
	let projectedPos = goal + (pos - goal) * 100;
	return Field.intersectRayDefenseArea(projectedPos, goal - projectedPos, radius, friendly)[1];
}

// calculates the time a robot needs around the defense area
// if robotway is set it has to be the way of the intersection of robot.pos with
// the defense area in the direction of the goal with the given radius
// this function does not make sense when either robot.pos or targetPos are far away from the defense area
// either targetPos or targetWay is optional, but one of the two has to be given
// endSpeed is a number
export function timeAroundDefenseAreaByWay (robot: Robot, robotWay: number | undefined, targetPos: Position,
		targetWay: undefined, radius: number, friendly: boolean, endSpeed?: number): number;
export function timeAroundDefenseAreaByWay (robot: Robot, robotWay: number | undefined, targetPos: undefined,
		targetWay: number, radius: number, friendly: boolean, endSpeed?: number): number;
export function timeAroundDefenseAreaByWay (robot: Robot, robotWay: number | undefined, targetPos: Position,
		targetWay: number, radius: number, friendly: boolean, endSpeed?: number): number {
	let targetGoal = friendly ? World.Geometry.FriendlyGoal : World.Geometry.OpponentGoal;
	if (robotWay == undefined) {
		robotWay = calculateWayForPosition(robot.pos, targetGoal, radius, friendly);
	}
	if (targetPos == undefined) {
		targetPos = Field.defenseIntersectionByWay(targetWay, radius, friendly);
	} else if (targetWay == undefined) {
		targetWay = calculateWayForPosition(targetPos, targetGoal, radius, friendly);
	}
	let drivePoints = Field.cornerPointsBetweenWays(robotWay, targetWay, radius, friendly);
	drivePoints.unshift(robot.pos);
	drivePoints.push(targetPos);
	let totalTime = 0;
	let fakeRobot = {speed: robot.speed, maxSpeed: robot.maxSpeed, acceleration: robot.acceleration};
	for (let i = 1;i<drivePoints.length;i++) {
		fakeRobot.pos = drivePoints[i-1]
		let es = new Vector(0, 0);
		if (i == drivePoints.length-1 && endSpeed != undefined) {
			es = new Vector(endSpeed, 0);
		}
		totalTime = totalTime + Physics.robotTimeToPos(fakeRobot, drivePoints[i], es);
		fakeRobot.speed = new Vector(0, 0);
	}
	return totalTime;
}


export function isPressed (robot: Robot, attackPos?: Position): boolean {
	let directionOffset = (World.Geometry.OpponentGoal - robot.pos).setLength(robot.shootRadius + World.Ball.radius);
	let ballPos = attackPos || robot.pos + directionOffset;
	let blockPos = ballPos + directionOffset;

	let radius = 2.5;
	for (let opp of World.OpponentRobots) {
		if (opp.pos.distanceToSq(blockPos) < radius * radius) {
			if (Physics.robotTimeToPos(opp, blockPos, new Vector(0, 0)) < 1) {
				return true;
			}
		}
	}
	return false;
}
Robot.isPressed = Cache.forFrame(Robot.isPressed)

export function _update () {
	resetMinTimeToBall();
	updateHadBall();
	updateTouchedBall();
	updateOwnStandardShooter();
}