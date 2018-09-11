import { Ball } from "base/ball";
import * as Cache from "base/cache";
import * as debug from "base/debug";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as plot from "base/plot";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import { AbsTime, RelTime } from "base/timing";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";

/// Returns the first robot that can reach the ball, along with the estimated time
// @param robotlist Robot[] - all robots that should be considered (e.g. World.FriendlyRobots)
// @return Robot - the fastest robot
// @return number - the estimated time (the robot will look towards its opponent goal)
function _firstRobotAtBall(robotlist: Robot[]): [Robot | undefined, RelTime] {
	let minTime: RelTime = Infinity;
	let minRobot: Robot | undefined = undefined;
	for (let r of robotlist) {
		let time =  ObserverRobot.minTimeToBall(r);
		if (time < minTime) {
			minTime = time;
			minRobot = r;
		}
	}
	return [minRobot, minTime];
}
export let firstRobotAtBall: ((robotlist: Robot[]) => [Robot | undefined, RelTime]) = Cache.forFrame(_firstRobotAtBall);

function _opponentBallDribbler(): Robot | undefined {
	let MAX_SPEED_DIFF = 1.5;
	let MAX_DISTANCE = 0.5;
	let MAX_ANGLE_TO_BALL_POS = 60 / 180 * Math.PI;
	let MAX_ANGLE_TO_BALL_SPEED = 10 / 180 * Math.PI;
	let slowBall = isSlowBall();
	let bestRobot: Robot | undefined = undefined;
	let bestDist = Infinity;
	for (let robot of World.OpponentRobots) {
		let distance = robot.pos.distanceTo(World.Ball.pos);
		let direction = Vector.fromAngle(robot.dir);
		if (robot.speed.distanceTo(World.Ball.speed) < MAX_SPEED_DIFF
				&& (slowBall || robot.speed.angleDiff(World.Ball.speed) < MAX_ANGLE_TO_BALL_SPEED)
				&&  distance < MAX_DISTANCE && distance < bestDist
				&&  World.Ball.posZ < 0.1
				&&  direction.absoluteAngleDiff(World.Ball.pos - robot.pos) < MAX_ANGLE_TO_BALL_POS) {
			bestRobot = robot;
			bestDist = distance;
		}
	}
	return bestRobot;
}
export let opponentBallDribbler: (() => Robot | undefined) = Cache.forFrame(_opponentBallDribbler);

/// Returns wether or not the ball is heading for a goal
// WARNING: this function has no hysteresis and must be used with care
// @param ball - a ball like structure
// @param ownGoal - wether to use the friendly goal or the opponent goal
// @return bool - wether or not the ball is heading for the goal
export function ballHeadingForGoal(ball: Ball, ownGoal: boolean): boolean {
	let friendlyFactor = ownGoal ? 1 : -1;
	let goalCenter = ownGoal ? World.Geometry.FriendlyGoal : World.Geometry.OpponentGoal;
	let [_, lambda] = geom.intersectLineLine(goalCenter, new Vector(1, 0), ball.pos, ball.speed);
	return lambda != undefined &&  Math.abs(lambda) < World.Geometry.GoalWidth / 2 + 0.2 && World.Ball.speed.y * friendlyFactor < 0;
}



/// Calculates the effective distance between ball and dribbler
// find an ellipsis with the left and right dribbler edge points as focal points
// dist is the length of the semi-minor axis
// @param robot robot - the robot to calculate
// @param ballPos vector - position of the ball
function ellipticDistance(robot: Robot, ballPos: Position): number {
	let dribblerPos = robot.pos + Vector.fromAngle(robot.dir).scaleLength(robot.shootRadius);
	let dribblerWidthHalf = Vector.fromAngle(robot.dir - Math.PI / 2).scaleLength(robot.dribblerWidth / 2);
	let leftDribblerEdge = dribblerPos + dribblerWidthHalf;
	let rightDribblerEdge = dribblerPos - dribblerWidthHalf;
	return 0.5 * Math.sqrt((leftDribblerEdge.distanceTo(ballPos) + rightDribblerEdge.distanceTo(ballPos)) ^ 2 - robot.dribblerWidth * robot.dribblerWidth);
}

/// Returns the ball owner or null if no one is nearer than Settings.ballOwnDistance(hysteresis)
// @param robotlist robot[] - the robots which are qualified for being a ball owner (default: World.Robots)
// @param lastBallOwner - the robot that was the ball owner before, used for hysteresis
// @return ballOwner robot - the robot that can be seen as ball owner, or null, if no robot is near the ball
const BALL_OWN_HYSTERESIS = 0.03;
let ballOwnerEllipticCache: Map<string | Robot, number> = new Map<string | Robot, number>();
function getBallOwner(robotlist: Robot[], lastBallOwner?: Robot) {
	if (!ballOwnerEllipticCache.has("ballInDangerRating")) {
		let ballInDangerRating = 0;
		for (let r of World.Robots) {
			let dist: number | undefined;
			// pre filter robots
			// dist = max(ballInDangerMaxDist, ballOwnDistance) + 2 * robot.radius
			// = 0.3 + 0.18 = 0.5
			if (r.pos.distanceToSq(World.Ball.pos) > 0.5 * 0.5) {
				dist = 0.5;
			} else {
				dist = ellipticDistance(r, World.Ball.pos);
			}
			ballOwnerEllipticCache.set(r, dist);
			if (dist < 0.05) {
				ballInDangerRating = ballInDangerRating + 1;
			} else if (dist < 0.30) {
				// distance must correlate to pre filter distance
				ballInDangerRating = ballInDangerRating + (0.30 - dist) * 4;
			}
		}
		ballOwnerEllipticCache.set("ballInDangerRating", ballInDangerRating);
	}

	let ballInDangerRating = <number> ballOwnerEllipticCache.get("ballInDangerRating");
	// distance must correlate to pre filter distance
	let ballOwnDistance = 0.2 - Math.min(ballInDangerRating, 2) * 0.04;

	// search robot with min dist to ball
	let minDist = Infinity;
	let ballOwner: Robot | undefined = undefined;
	for (let r of robotlist) {
		let dist = ballOwnerEllipticCache.get(r);
		if (dist != undefined && dist < minDist && dist <= ballOwnDistance) {
			minDist = dist;
			ballOwner = r;
		}
	}

	// calculate dist from lastBallOwner to ball
	let lastDist = Infinity;
	if (lastBallOwner != undefined) {
		lastDist = ballOwnerEllipticCache.has(lastBallOwner) ? <number> ballOwnerEllipticCache.get(lastBallOwner) : lastDist;
	}

	// set new lastBallOwner or null, if no robot is near ball
	if ((minDist + BALL_OWN_HYSTERESIS) < lastDist
			||  (ballOwner == undefined &&  lastDist >= ballOwnDistance + BALL_OWN_HYSTERESIS)) {
		lastBallOwner = ballOwner;
	}

	return lastBallOwner;
}


let lastBallOwnerFriendly: Robot | undefined;
let lastFriendlyBallOwnerTime: AbsTime = 0;
export function friendlyBallOwner() {
	return lastBallOwnerFriendly;
}

export function friendlyBallOwnerTime() {
	return lastFriendlyBallOwnerTime;
}

function updateFriendlyBallOwner() {
	ballOwnerCheckCache();
	lastBallOwnerFriendly = getBallOwner(World.FriendlyRobots, lastBallOwnerFriendly);
	if (lastBallOwnerFriendly != undefined) {
		lastFriendlyBallOwnerTime = World.Time;
	}
	debug.pushtop();
	debug.set("last friendly ball owner", lastBallOwnerFriendly);
	debug.pop();
}

let lastBallOwnerOpponent: Robot | undefined;
let lastOpponentBallOwnerTime: AbsTime = 0;
export function opponentBallOwner(): Robot | undefined {
	return lastBallOwnerOpponent;
}

function updateOpponentBallOwner() {
	ballOwnerCheckCache();
	lastBallOwnerOpponent = getBallOwner(World.OpponentRobots, lastBallOwnerOpponent);
	if (lastBallOwnerOpponent != undefined) {
		lastOpponentBallOwnerTime = World.Time;
	}
	debug.pushtop();
	debug.set("last opponent ball owner", lastBallOwnerOpponent);
	debug.pop();
}

export function opponentBallOwnerTime(): AbsTime {
	return lastOpponentBallOwnerTime;
}

let friendlyBallOwnershipTime: AbsTime = 0;
let curFriendlyBallOwnershipDuration: RelTime = 0;
function updateFriendlyBallOwnershipTime() {
	let lastStateChangeTime: AbsTime = Referee.lastStateChangeTime();
	if (opponentBallOwnerTime() > friendlyBallOwnerTime() || Referee.isStopState()) {
		friendlyBallOwnershipTime = 0;
		curFriendlyBallOwnershipDuration = 0;
	} else if (friendlyBallOwnershipTime === 0 && friendlyBallOwnerTime() > opponentBallOwnerTime()
			&&  lastStateChangeTime && lastStateChangeTime < friendlyBallOwnerTime()) {
		friendlyBallOwnershipTime = friendlyBallOwnerTime();
	} else if (friendlyBallOwnershipTime !== 0) {
		curFriendlyBallOwnershipDuration = World.Time - friendlyBallOwnershipTime;
	}
}

export function friendlyBallOwnershipDuration(): RelTime {
	return curFriendlyBallOwnershipDuration;
}

function ballOwnerCheckCache() {
	ballOwnerEllipticCache = new Map<string | Robot, number>();
}

let ballRecipients: Map<Robot, boolean> = new Map<Robot, boolean>();
function updateReceivesPass() {
	let ballSpeed: number = World.Ball.speed.length();
	if (ballSpeed < 0.5) {
		ballRecipients = new Map<Robot, boolean>();
		return;
	}

	let ballDir = World.Ball.speed.angle();
	let coneWidthSmall = 50 * Math.PI / 180;
	let coneWidthLarge = 65 * Math.PI / 180;
	let coneAngleMinSmall = ballDir - coneWidthSmall / 2;
	let coneAngleMinLarge = ballDir - coneWidthLarge / 2;

	let newBallRecipients: Map<Robot, boolean> = new Map<Robot, boolean>();
	for (let robot of World.Robots) {

		// check if the robot is inside the cone (hysteresis)
		let coneWidth = ballRecipients.has(robot) ? coneWidthLarge : coneWidthSmall;
		let coneAngleMin = ballRecipients.has(robot) ? coneAngleMinLarge : coneAngleMinSmall;

		let maxRobotTime: RelTime = 0.4;
		let robotBallDistance = World.Ball.pos.distanceTo(robot.pos);
		let maxMoveDistance = (ballSpeed + robot.maxSpeed) * maxRobotTime;
		let robotTime: number;
		if (maxMoveDistance < robotBallDistance) {
			robotTime = maxRobotTime;
		} else {
			robotTime = MathUtil.bound(0, ObserverRobot.minTimeToBall(robot), maxRobotTime);
		}
		let extrapolatedRobotPos = robot.pos + robot.speed * robotTime;
		let toRobotAngle = (extrapolatedRobotPos - World.Ball.pos).angle();
		if (robotBallDistance > World.Ball.radius + robot.shootRadius
				&&  geom.normalizeAnglePositive(toRobotAngle - coneAngleMin) > coneWidth) {
			continue;
		}

		// check if the arriving ball is fast enough (hysteresis)
		let minBallSpeed = ballRecipients.has(robot) ? 0.5 : 1.0;
		let dribblerPos = extrapolatedRobotPos + Vector.fromAngle(robot.dir) * robot.shootRadius;
		let distanceToRobot = World.Ball.pos.distanceTo(dribblerPos);
		if (Physics.ballAtTime(World.Ball, Physics.ballRollTime(
				World.Ball, distanceToRobot)).speed.length() < minBallSpeed) {
			continue;
		}

		newBallRecipients.set(robot, true);


		vis.addCircle("o/ball: receivesPass", robot.pos, 0.15,
			vis.fromRGBA(127, 191, 255, 63), true, true);
	}

	ballRecipients = newBallRecipients;
}

export function receivesPass(robot: Robot): boolean {
	return ballRecipients.get(robot) || false;
}

let lastBallSpeedLength = 0; // used for both isAccelerating() and isShot()
let ballIsAccelerating = false;
export function isAccelerating(): boolean {
	return ballIsAccelerating;
}

function updateIsAccelerating() {
	let currentBallSpeedLength = World.Ball.speed.length();
	ballIsAccelerating = currentBallSpeedLength > lastBallSpeedLength + 0.2;
	lastBallSpeedLength = currentBallSpeedLength;
}


let lastShootTime: AbsTime = 0;
let lastShootRobot: Robot | undefined = undefined;
export function isShot(): Robot | undefined {
	if (lastShootTime === World.Time) {
		return lastShootRobot;
	}
	return undefined;
}

export function wasShot(time: RelTime): Robot | undefined {
	if (lastShootTime + time >= World.Time) {
		return lastShootRobot;
	}
	return undefined;
}

function updateIsShot() {
	if (!World.Ball.isPositionValid()) {
		return;
	}

	let ballSpeedLength = World.Ball.speed.length();

	// if the ball was not shot in the last tenth second
	let condCooldown = (World.Time > lastShootTime + 0.3);
	// if the ball accelerates
	let condAccelerates = isAccelerating();
	// if the ball is fast
	let condFast = (ballSpeedLength > 0.5);
	// if one robot had the ball the last 0.1 seconds (equal to cooldown time)
	let condHadBall = false;
	// if this robot looks about in the same direction as the ball rolls
	let condDirection = false;
	// if the ball is distinctly faster than this robot
	let condFasterThanRobot = false;

	debug.pushtop("Ball.isShot");
	let robot: Robot | undefined = undefined;
	if (condCooldown && condAccelerates && condFast) {
		for (let r of World.Robots) {
			if (ObserverRobot.hadBall(r, 0.3)) {
				condHadBall = true;
				let anglediff = Math.abs(geom.getAngleDiff(r.dir, World.Ball.speed.angle()));
				// the ball has to be shot in the approximate direction the robot is facing
				condDirection = (anglediff < 45 / 180 * Math.PI);
				// the ball has to be 0.1m/s faster than the robot
				condFasterThanRobot = (ballSpeedLength > 0.1 + r.speed.length());
				debug.set("robot speed", r.speed.length());
				if (condDirection && condFasterThanRobot) {
					robot = r;
					break;
				}
			}
		}
	}

	// lastShootTime is used for the cooldown
	if (robot != undefined) {
		lastShootTime = World.Time;
		lastShootRobot = robot;
	}

	debug.set("cooldown", condCooldown);
	debug.set("accelerates", condAccelerates);
	debug.set("fast", condFast);
	debug.set("hadBall", condHadBall);
	debug.set("direction", condDirection);
	debug.set("fasterThanRobot", condFasterThanRobot);
	debug.pop();

	plot.addPlot("isShot", robot != undefined ? (robot.id + (robot.isFriendly ? 0 : 0.5)) : -1);
}

let ballPosBuffer: Map<AbsTime, Position> = new Map<AbsTime, Position>();
let ballPosBufferTimeFrame = 1;
let ballPosBufferMaxBallSpeed = 1;
function updateIsDangerousDuelSituation() {
	if (!Referee.isGameState() || World.Ball.speed.length() > ballPosBufferMaxBallSpeed) {
		ballPosBuffer = new Map<AbsTime, Position>();
		return;
	}

	for (let [time, _] of ballPosBuffer) {
		if (World.Time - time > ballPosBufferTimeFrame) {
			ballPosBuffer.delete(time);
		}
	}

	// if World.Ball.speed.length() < ballPosBufferMaxBallSpeed then
		ballPosBuffer.set(World.Time, World.Ball.pos);
	// end
}

let ballPosHysteresis = 0.5; // to each side
function _isDangerousDuelSituation(lastDecision: boolean): boolean {
	let max_y = -Infinity;
	let min_time: AbsTime = Infinity;
	let max_time: AbsTime = 0;
	for (let [time, ballPos] of ballPosBuffer) {
		if (ballPos.y > max_y) {
			max_y = ballPos.y;
		}
		if (time < min_time) {
			min_time = time;
		}
		if (time > max_time) {
			max_time = time;
		}
	}

	let time_interval: RelTime = max_time - min_time;
	if (time_interval === Infinity || time_interval <= 0.5) {
		return false;
	}

	let hysteresis = lastDecision ? -ballPosHysteresis : ballPosHysteresis;
	let danger = max_y + hysteresis < -0.2 * World.Geometry.FieldHeightHalf;

	if (danger) {
		vis.addCircle("o/ball: dangerous duel situation", World.Ball.pos, 0.07, vis.colors.redHalf, true);
	}

	return false;
}
export let isDangerousDuelSituation: (lastDecision: boolean) => boolean = Cache.forFrame(_isDangerousDuelSituation);

let flyingOrBouncingTimestamp: AbsTime = 0;
function updateIsFlyingOrBouncing() {
	if (World.Ball.posZ !== 0) {
		flyingOrBouncingTimestamp = World.Time;
	}
}

export function isFlyingOrBouncing(): boolean {
	return World.Time - flyingOrBouncingTimestamp < 0.1;
}

// TODO: might be better to implement a more refined version in the tracking
const MAX_FRAME_DISTANCE = 1.5;
const MAX_INVISIBLE_TIME = 1.5;
let lastRealisticBallPos: Position;
let lastRealisticBallTime: AbsTime = 0;
export function getRealisticBallPos(): Position {
	return lastRealisticBallPos;
}

function updateLastRealisticBall() {
	if (lastRealisticBallPos == undefined ||  lastRealisticBallPos.distanceTo(World.Ball.pos) < MAX_FRAME_DISTANCE
			||  World.Time - lastRealisticBallTime > MAX_INVISIBLE_TIME) {
		lastRealisticBallPos = World.Ball.pos.copy();
		lastRealisticBallTime = World.Time;
	}
}

const SLOW_BALL_SPEED = 0.5;
const SLOW_BALL_HYSTERESIS = 0.1;
let slowBall = false;
export function isSlowBall(): boolean {
	return slowBall;
}

function updateIsSlowBall() {
	let hysteresisSpeed = SLOW_BALL_SPEED + (slowBall ? SLOW_BALL_HYSTERESIS : 0);
	slowBall = World.Ball.speed.lengthSq() < hysteresisSpeed * hysteresisSpeed;
}

export function _update() {
	updateReceivesPass();
	updateIsAccelerating();
	updateIsShot();
	updateIsDangerousDuelSituation();
	updateIsFlyingOrBouncing();
	updateLastRealisticBall();
	updateIsSlowBall();
	updateOpponentBallOwner();
	updateFriendlyBallOwner();
	updateFriendlyBallOwnershipTime();
}
