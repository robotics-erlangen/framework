import { Ball } from "base/ball";
import * as Cache from "base/cache";
import * as debug from "base/debug";
import * as geom from "base/geom";
import { min, some } from "base/listutil";
import * as MathUtil from "base/mathutil";
import * as plot from "base/plot";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import { AbsTime, RelTime } from "base/timing";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";

type FirstRobotAtBall = (robotlist: Robot[]) => [Robot | undefined, RelTime];
/**
 * Returns the first robot that can reach the ball, along with the estimated
 * time. The robot need not look toward its opponent goal.
 *
 * @param robotlist - All robots that should be considered (e.g. World.FriendlyRobots)
 * @returns The fastest robot
 * @returns The estimated time
 */
export const firstRobotAtBall: FirstRobotAtBall = Cache.forFrame(
	(robotlist: Robot[]) => min(robotlist, ObserverRobot.minTimeToBallNoTarget)
);

function _opponentBallDribbler(): Robot | undefined {
	const MAX_SPEED_DIFF = 1.5;
	const MAX_DISTANCE = 0.5;
	const MAX_ANGLE_TO_BALL_POS = geom.degreeToRadian(60);
	const MAX_ANGLE_TO_BALL_SPEED = geom.degreeToRadian(10);
	const slowBall = isSlowBall();
	let bestRobot: Robot | undefined = undefined;
	let bestDist = Infinity;

	// returns whether the robot moves toward the future ball position
	// velocity and whether the robot can actually reach the ball is ignored
	// the idea is to check whether the velocity vectors of the robot and the ball meet somewhere in the future
	// meaning they build a valid triangle if vector length is ignored
	// If they point to the same side of the Robot-to-Ball vector and the sum of the angles to this vector is < 180°
	// then it is a triangle
	function checkIfPossibleFutureCollisionWithBall(robot: Robot): boolean {
		const fromRobotToBall = (World.Ball.pos - robot.pos).normalized();
		const angleRobotSpeedToBallPos = fromRobotToBall.dot(robot.speed.normalized());
		const angleBallSpeedToBallRobotPos = (-fromRobotToBall).dot(World.Ball.speed.normalized());
		const pointToSameSide = angleRobotSpeedToBallPos * angleBallSpeedToBallRobotPos > 0;
		return pointToSameSide && (Math.acos(angleRobotSpeedToBallPos) + Math.acos(angleBallSpeedToBallRobotPos)) < Math.PI;
	}

	function checkPossiblePseudoDribbling(robot: Robot): boolean {
		// Robot is in 60 degree cone behind ball
		const robotBehindBall = Math.acos((robot.pos - World.Ball.pos).normalized().dot(-World.Ball.speed.normalized())) < geom.degreeToRadian(60);
		// Robot looking at Ball
		// Either the robot is looking straight at the ball, or it is looking at the next pass target
		// In the second case, the robot has to compensate for the wring looking direction by movement
		// Therefore the orthogonal components of speed and dir to the Ball speed will point in different directions
		const robotLookingAtBall = Vector.fromAngle(robot.dir).absoluteAngleDiff(World.Ball.pos - robot.pos) < geom.degreeToRadian(20);
		const orthogonalSpeedComponent = robot.speed.orthogonalComponent(World.Ball.speed);
		const orthogonalDirComponent = Vector.fromAngle(robot.dir).orthogonalComponent(World.Ball.speed);
		const movementCompensatesMismatch = orthogonalSpeedComponent.dot(orthogonalDirComponent) < 0;

		// Robot parallel speed diff to ball small
		const smallParallelSpeedDiff = (robot.speed.parallelComponent(World.Ball.speed) - World.Ball.speed).lengthSq() < 0.5 * 0.5;

		return robotBehindBall && (robotLookingAtBall || movementCompensatesMismatch) && smallParallelSpeedDiff;
	}

	for (let robot of World.OpponentRobots) {
		let distance = robot.pos.distanceTo(World.Ball.pos);
		let direction = Vector.fromAngle(robot.dir);

		if (robot.speed.distanceTo(World.Ball.speed) < MAX_SPEED_DIFF
				&& (
					slowBall ||
					robot.speed.angleDiff(World.Ball.speed) < MAX_ANGLE_TO_BALL_SPEED ||
					checkIfPossibleFutureCollisionWithBall(robot) ||
					checkPossiblePseudoDribbling(robot)
				)
				&& distance < MAX_DISTANCE && distance < bestDist
				&& World.Ball.posZ < 0.1
				&& direction.absoluteAngleDiff(World.Ball.pos - robot.pos) < MAX_ANGLE_TO_BALL_POS) {
			bestRobot = robot;
			bestDist = distance;
		}
	}
	return bestRobot;
}
export let opponentBallDribbler: (() => Robot | undefined) = Cache.forFrame(_opponentBallDribbler);

/**
 * Returns wether or not the ball is heading for a goal
 * WARNING: this function has no hysteresis and must be used with care
 * @param ball - A ball like structure
 * @param ownGoal - Whether to use the friendly goal or the opponent goal
 * @returns Whether or not the ball is heading for the goal
 */
export function ballHeadingForGoal(ball: Ball, ownGoal: boolean): boolean {
	let friendlyFactor = ownGoal ? 1 : -1;
	let goalCenter = ownGoal ? World.Geometry.FriendlyGoal : World.Geometry.OpponentGoal;
	let [_, lambda] = geom.intersectLineLine(goalCenter, new Vector(1, 0), ball.pos, ball.speed);
	return lambda != undefined && Math.abs(lambda) < World.Geometry.GoalWidth / 2 + 0.2 && World.Ball.speed.y * friendlyFactor < 0;
}



/**
 * Calculates the effective distance between ball and dribbler
 * find an ellipsis with the left and right dribbler edge points as focal points
 * dist is the length of the semi-minor axis
 * @param robot - The robot to calculate
 * @param ballPos - Position of the ball
 */
export function ellipticDistance(robot: Robot, ballPos: Position): number {
	let dribblerWidthHalf = Vector.fromPolar(robot.dir - Math.PI / 2, robot.dribblerWidth / 2);
	let leftDribblerEdge = robot.dribblerPos + dribblerWidthHalf;
	let rightDribblerEdge = robot.dribblerPos - dribblerWidthHalf;
	return 0.5 * Math.sqrt((leftDribblerEdge.distanceTo(ballPos) + rightDribblerEdge.distanceTo(ballPos)) ** 2 - robot.dribblerWidth * robot.dribblerWidth);
}

/**
 * Returns the ball owner or null if no one is nearer than Settings.ballOwnDistance(hysteresis)
 * @param robotlist - robot[] - the robots which are qualified for being a ball owner (default: World.Robots)
 * @param lastBallOwner - the robot that was the ball owner before, used for hysteresis
 * @returns ballOwner robot - the robot that can be seen as ball owner, or null, if no robot is near the ball
 */
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
			|| (ballOwner == undefined && lastDist >= ballOwnDistance + BALL_OWN_HYSTERESIS)) {
		lastBallOwner = ballOwner;
	}

	return lastBallOwner;
}

let previousBallOwner: Robot | undefined;
function updateLastBallOwner() {
	if (friendlyBallOwnerTime() > opponentBallOwnerTime()) {
		previousBallOwner = friendlyBallOwner() ? friendlyBallOwner() : previousBallOwner;
	} else {
		previousBallOwner = opponentBallOwner() ? opponentBallOwner() : previousBallOwner;
	}
}

/**
 * Returns the last robot that was considered a ball owner
 * @returns previousBallOwner robot - the last ball owning robot, or undefined if there is none
 */
export function lastBallOwner(): Robot | undefined {
	return previousBallOwner;
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
			&& lastStateChangeTime != undefined && lastStateChangeTime < friendlyBallOwnerTime()) {
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
	/* A robot should be in a cone in front of the ball for the robot to be
	 * considered to receive a pass
	 *
	 * Hysteresis should be applied as usual. However, there is a larger
	 * hysteresis if the ball is closer as the angle between ball and dribbler
	 * tends to get more unstable the closer the ball is to the robot
	 */
	const coneWidthSmall = geom.degreeToRadian(50);
	const coneWidthMedium = geom.degreeToRadian(65);
	const coneWidthLarge = geom.degreeToRadian(120);

	let newBallRecipients: Map<Robot, boolean> = new Map<Robot, boolean>();
	for (let robot of World.Robots) {
		let maxRobotTime: RelTime = 0.4;
		let robotBallDistance = World.Ball.pos.distanceTo(robot.pos);
		let maxMoveDistance = (ballSpeed + robot.maxSpeed) * maxRobotTime;
		let robotTime: number;
		if (maxMoveDistance < robotBallDistance) {
			robotTime = maxRobotTime;
		} else {
			robotTime = MathUtil.bound(0, ObserverRobot.minTimeToBall(robot), maxRobotTime);
		}

		/* Consider both the robot center and the dribbler position for the
		 * angle calculation there can be a difference when the ball is very
		 * close to the robot (but not quite close enough to disable the
		 * condition) this makes receivesPass more stable for shooting robots.
		 *
		 * Also consider the edges of the dribbler. When the ball is close, the
		 * center may be outside the cone while the ball will still hit the
		 * robot front. This may lead to more false positives (where to
		 * dribbler edge is in the cone but the ball won't actually hit the
		 * robot) but false positives are preferable to false negatives
		 */
		let extrapolatedRobotPos = robot.pos + robot.speed * robotTime;
		let extrapolatedDribblerPos = extrapolatedRobotPos + Vector.fromPolar(robot.dir, robot.shootRadius);

		/* Note that it may not be necessary to check extrapolatedRobotPos (the
		 * dribbler positions may be sufficient). This should be validated
		 * before however.
		 */
		const checkForConePositions = [
			extrapolatedRobotPos,
			extrapolatedDribblerPos,
			...ObserverRobot.getDribblerEdges({
				dir: robot.dir,
				dribblerPos: extrapolatedRobotPos,
				dribblerWidth: robot.dribblerWidth
			})
		];

		// check if the robot is inside the cone (hysteresis)
		let coneWidth: number;
		if (!ballRecipients.has(robot)) {
			coneWidth = coneWidthSmall;
		} else if (robotBallDistance > World.Ball.radius + robot.radius) {
			coneWidth = coneWidthMedium;
		} else {
			coneWidth = coneWidthLarge;
		}
		/* ballDir transforms the angle between ball and dribbler/robot to be
		 * local, i.e independent of the ball's global movement
		 */
		const coneAngleMin = ballDir - coneWidth / 2;

		const robotInCone = some(checkForConePositions, (pos) => {
			const globalAngle = (pos - World.Ball.pos).angle();
			return geom.normalizeAnglePositive(globalAngle - coneAngleMin) <= coneWidth;
		});

		if (robotBallDistance > World.Ball.radius + robot.radius
				&& !robotInCone) {
			continue;
		}

		// check if the arriving ball is fast enough (hysteresis)
		let minBallSpeed = ballRecipients.has(robot) ? 0.5 : 1.0;
		let distanceToRobot = World.Ball.pos.distanceTo(extrapolatedDribblerPos);
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

// for testing purposes
export function setReceivesPass(robot: Robot, receives: boolean) {
	ballRecipients.set(robot, receives);
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

/**
 * Checks whether the ball was shot in the last time seconds
 * @param time - The timeframe to check
 * @returns The shooter or `undefined` if no-one shot the ball in the last
 *          `time` seconds
 */
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

	const ballSpeedLength = World.Ball.speed.length();

	// if the ball was not shot in the last tenth second
	const condCooldown = (World.Time > lastShootTime + 0.3);
	// if the ball accelerates
	const condAccelerates = isAccelerating();
	// if the ball is fast
	const condFast = (ballSpeedLength > 0.5);

	let robot: Robot | undefined = undefined;
	if (condCooldown && condAccelerates && condFast) {
		for (let r of World.Robots) {
			if (ObserverRobot.hadBall(r, 0.3)) {
				const anglediff = Math.abs(geom.getAngleDiff(r.dir, World.Ball.speed.angle()));
				// the ball has to be shot in the approximate direction the robot is facing
				const condDirection = (anglediff < geom.degreeToRadian(45));
				// the ball has to be 0.1m/s faster than the robot
				const condFasterThanRobot = (ballSpeedLength > 0.1 + r.speed.length());
				const condAwayFromRobot = World.Ball.pos.distanceTo(r.pos) > r.radius + 0.08;
				if (condDirection && condFasterThanRobot && condAwayFromRobot) {
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

function uLRBCondition() {
	debug.pushtop("last realistic ball");
	if (lastRealisticBallPos == undefined) {
		debug.set(undefined, "initial");
		debug.pop();
		return true; // always update if no previous data is known
	}
	if (lastRealisticBallPos.distanceToSq(World.Ball.pos) < MAX_FRAME_DISTANCE * MAX_FRAME_DISTANCE) {
		debug.set(undefined, "close");
		debug.pop();
		return true; // do update if the position seems plausible
	}
	if (World.Time - lastRealisticBallTime <= MAX_INVISIBLE_TIME) {
		debug.set(undefined, "waiting");
		debug.pop();
		return false; // we don't want to update the prediction with bad data too quickly,
		// but we do need to update after some time to stay responsive,
		// for example if the ball was moved by the referee
	}
	if (World.Ball.detectionQuality > 0.2) {
		debug.set(undefined, "good");
		debug.pop();
		return true; // if the data is good, we take it after some time
	}
	if (World.RefereeState === "BallPlacementDefensive" || World.RefereeState === "BallPlacementOffensive") {
		debug.set(undefined, "ball placement");
		debug.pop();
		return false; // we do not want to use bad data during Ballplacement, as it's not as important to be responsive
	}
	debug.set(undefined, "default");
	debug.pop();
	return true; // during regular matches we need to be more responsive, so we take bad data.
	// This is quite dangerous as false detections seem to be taken by the tracking eagerly if
	// no other option is visible, but compared to ballplacement we need to be quicker.
	// Also, the ball isn't as often invisible during normal play.
	// Use this function during normal play AT YOUR OWN RISK.
}

function updateLastRealisticBall() {
	if (uLRBCondition()) {
		lastRealisticBallPos = World.Ball.pos;
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

let ballPlacementRobots: Robot[] = [];

export function getBallPlacementRobots(): Robot[] {
	return ballPlacementRobots;
}

// removes an element from an array, if the array contains the element, does not do anything otherwise
function deleteElement<T>(element: T, array: T[]) {
	const index = array.indexOf(element, 0);
	if (index > -1) {
		array.splice(index, 1);
	}
}

function insertElement<T>(element: T, array: T[]) {
	const index = array.indexOf(element, 0);
	if (index === -1) {
		array.push(element);
	}
}

const BP_FAST_SPEED_SQ = 3 * 3;
const BP_SLOW_SPEED_SQ = 2 * 2;
const BP_CLOSE_DIS = 0.1;
const BP_FAR_DIS_SQ = 2 * 2;
function updateBallPlacementRobots() {
	if (World.RefereeState !== "BallPlacementDefensive") {
		ballPlacementRobots = [];
		return;
	}
	for (let r of World.OpponentRobots) {
		if (r.pos.distanceTo(getRealisticBallPos()) < (BP_CLOSE_DIS + World.Ball.radius + r.radius) && r.speed.lengthSq() < BP_SLOW_SPEED_SQ) {
			insertElement(r, ballPlacementRobots);
		}
		if (r.pos.distanceToSq(getRealisticBallPos()) > BP_FAR_DIS_SQ || r.speed.lengthSq() > BP_FAST_SPEED_SQ) {
			deleteElement(r, ballPlacementRobots);
		}
	}

	// find all ballPlacementRobots that were removed from the field
	let toRemove = [];
	for (let r of ballPlacementRobots) {
		if (!World.OpponentRobots.includes(r)) {
			toRemove.push(r);
		}
	}

	// remove them
	for (let r of toRemove) {
		deleteElement(r, ballPlacementRobots);
	}
}

let lastIsStanding = false;
export function isStanding() {
	return lastIsStanding;
}

/** Threshold for how long a shot is allowed to be past for the ball to be considered as recently shot. */
const shootDeltaTime = 0.20;

/** Threshold for the mean speed */
const speedMeanThreshold = 0.2;

/** Threshold for the local speed */
const speedThreshold = 0.50;

/** Threshold for standard deviation of positions */
const deviationThreshold = 0.020;

/** How many positions to compare to each other */
const numberOfMeasurements = 6;

/** Used to index the last <numberOfMeasurements> measured positions and speeds */
let lastIndex = 0;
let standardVector = new Vector(0, 0);
let lastBallPositions: Vector[] = new Array(numberOfMeasurements);
let lastSpeedVectors: Vector[] = new Array(numberOfMeasurements);
for (let i = 0; i < numberOfMeasurements; i++) {
	lastBallPositions[i] = standardVector;
	lastSpeedVectors[i] = standardVector;
}

function updateIsStanding() {
	// Calculate the mean of the last <numberOfMeasurements> speed Vectors and check it's length
	// Randomly generarted noise speeds will statistically cancel each other out
	// Speed vectors which point in the general same direction will add up
	let condSameDirection = true;
	let speedMean = new Vector(0, 0);
	for (let i = 0; i < lastSpeedVectors.length; i++) {
		speedMean = speedMean + lastSpeedVectors[i];
	}

	speedMean = speedMean + World.Ball.speed;
	speedMean = speedMean / lastSpeedVectors.length;

	condSameDirection = speedMean.length() > speedMeanThreshold;

	lastSpeedVectors[lastIndex] = World.Ball.speed;

	// Calculate standard deviation between last ball positions and their mean value
	lastBallPositions[lastIndex] = World.Ball.pos;
	lastIndex = (lastIndex + 1) % numberOfMeasurements;

	// mean position
	let positionMean = new Vector(0, 0);
	for (let i = 0; i < lastBallPositions.length; i++) {
		positionMean = positionMean + lastBallPositions[i];
	}

	positionMean = positionMean / lastBallPositions.length;

	// calculate standard deviation
	let sum = 0;
	for (let i = 0; i < lastBallPositions.length; i++) {
		sum = sum + (lastBallPositions[i] - positionMean).lengthSq();
	}
	sum = (sum / (lastBallPositions.length - 1));
	let standardDeviation = Math.sqrt(sum);
	let condDeviation = standardDeviation > deviationThreshold;

	// check for absolute local speed
	let condSpeed = World.Ball.speed.length() > speedThreshold;

	// check if ball was recently shot
	let condWasShot = wasShot(shootDeltaTime) != undefined;

	// log evaluation
	debug.pushtop("Ball.isStanding");
	debug.set("sameDirection", condSameDirection);
	debug.set("Deviation", condDeviation);
	debug.set("Speed", condSpeed);
	debug.set("wasShot", condWasShot);
	debug.pop();

	lastIsStanding = !(condSameDirection || condSpeed || condDeviation || condWasShot);
}

let wasInterrupted = false;
export function interruped() {
	return wasInterrupted;
}

let angleOld = World.Ball.speed.angle();
let speedOld = World.Ball.speed.length();

function updateInterrupted() {
	// A ball is called interrupted if and only if:
	// - the angle at which the ball was originally shot changed (> 28 degrees)
	// - the speed at which the ball was originally travelling change drasticly (> 3 m/s)
	let angleNew = World.Ball.speed.angle();
	let speedNew = World.Ball.speed.length();

	let angleDiff = Math.abs(geom.getAngleDiff(angleOld, angleNew));
	let speedDiff = Math.abs(speedNew - speedOld);

	debug.pushtop("Ball.interrupted");
	debug.set("angleDiff", angleDiff);
	debug.set("speedDiff", speedDiff);
	debug.set("wasInterrupted", wasInterrupted);
	debug.pop();

	wasInterrupted = angleDiff > geom.degreeToRadian(28) || speedDiff > 3;

	angleOld = angleNew;
	speedOld = speedNew;
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
	updateLastBallOwner();
	updateFriendlyBallOwnershipTime();
	updateBallPlacementRobots();
	updateIsStanding();
	updateInterrupted();
}
