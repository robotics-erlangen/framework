import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, RelativePosition, Speed, Vector } from "base/vector";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import * as Rating from "glados/util/rating";

let G = World.Geometry;


export function centerBackDistanceToDefenseArea() {
	// 0.18 (robot diameter) + 0.08 (default distance) + 0.50 (stop radius)
	if (Referee.isStopState()) {
		let dist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius);
		return MathUtil.bound(0.01, dist - 0.68, 0.08);
	}
	return 0.08;
}

export let centerBackDefaultPos = new Vector(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.09 + 0.02);

export let POSITION_PADDING = 0.02; // safety distance
export let PENALTY_LINE_DISTANCE = 0.35; // prevent robots from crossing the penalty line

export let MARKING_DISTANCE = 0.6;
export let OFFENSIVE_MARKING_DISTANCE = 0.3;

function _manMarkPos(opponent: { pos: Position, radius: number, speed: Speed }): Position {
	// use the position at which the robot would brake if it started immediately
	let targetPos = Physics.robotBrakePos({pos: opponent.pos, speed: opponent.speed});
	if (World.Ball.pos.y > G.FieldHeightHalf * 0.7 && World.Ball.speed.length() < 0.5 && Referee.isStopState()) {
		let dist = opponent.radius + Constants.maxRobotRadius + OFFENSIVE_MARKING_DISTANCE;
		targetPos = targetPos + (World.Ball.pos - targetPos).setLength(dist);
	} else {
		let oppDistToGoal = targetPos.distanceTo(G.FriendlyGoal);
		let markingDistance = MARKING_DISTANCE + Math.max(0, (oppDistToGoal - G.FieldHeightHalf * 0.8) * 0.5);
		if (Referee.isFriendlyFreeKickState()) {
			markingDistance = markingDistance + 0.4;
		}
		let dist = opponent.radius + Constants.maxRobotRadius + markingDistance;
		dist = Math.min(oppDistToGoal - 0.01, dist);
		targetPos = targetPos + (G.FriendlyGoal - targetPos).setLength(dist);
	}

	if (Field.isInFriendlyDefenseArea(targetPos, Constants.maxRobotRadius)) {
		let defenseIntersection = Field.intersectRayDefenseArea(targetPos,
			targetPos - G.FriendlyGoal, Constants.maxRobotRadius, true)[0];
		// just to be sure
		if (defenseIntersection != undefined) {
			targetPos = defenseIntersection;
		} else {
			targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius);
		}
	} else {
		targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius);
	}

	let intersectionDefenseArea = Field.intersectRayDefenseArea(targetPos,
				G.FriendlyGoal - targetPos,
				Constants.maxRobotRadius + 0.1, true)[0];

	if (intersectionDefenseArea && !Referee.isStopState()) {
		targetPos = intersectionDefenseArea + (targetPos - intersectionDefenseArea).scaleLength(0.3);
	}

	if (Referee.isStopState() && !Referee.isKickoffState() || intersectionDefenseArea
				&& intersectionDefenseArea.distanceToSq(targetPos) < 0.75 * 0.75) {
		targetPos = intersectionDefenseArea || targetPos;
	}

	if (World.RefereeState === "PenaltyOffensivePrepare" || World.RefereeState === "PenaltyOffensive") {
		targetPos.y = Math.min(targetPos.y, G.PenaltyLine - PENALTY_LINE_DISTANCE);
	}

	return targetPos;
}
export let manMarkPos: (opponent: { pos: Position, radius: number, speed: Speed }) => Position = Cache.forFrame(_manMarkPos);

function _piggyPos(opponent: Robot): Position {
	let passLine = World.Ball.pos - opponent.pos;

	let perpendicularOffset = passLine.perpendicular().setLength(0.3);


	let offset = passLine.setLength(0.3) + perpendicularOffset;

	return opponent.pos + offset;
}
export let piggyPos: (opponent: Robot) => Position = Cache.forFrame(_piggyPos);

let wasGoalLineIntersection = false;
function _calculateBallPositionField(): [Position, RelativePosition | undefined] {
	let [targetPos, targetDir, isShot] = Goal.predictShot();
	if (isShot && targetDir.y < 0) {
		let goalLineIntersection = geom.intersectLineLine(targetPos,
			targetDir, World.Geometry.FriendlyGoal, new Vector(1, 0))[0];
		let extraWidth = wasGoalLineIntersection ? 0.25 : 0.15;
		if (goalLineIntersection  &&
				Math.abs(goalLineIntersection.x) < World.Geometry.GoalWidth / 2 + extraWidth) {
			wasGoalLineIntersection = true;
			return [targetPos, targetDir];
		}
	}
	wasGoalLineIntersection = false;
	return [targetPos, undefined];
}
export let calculateBallPositionField: () => [Position, RelativePosition | undefined] = Cache.forFrame(_calculateBallPositionField);

export function calculateBallPosition() {
	let [pos, dir] = calculateBallPositionField();
	return centerBackPos(pos, dir);
}

// calculates the centerBackPos for a target
// if targetDir is supplied, the CB will position itself between targetPos and intersectRayDefenseArea(pos, dir, ...)
// if that intersection is empty or no dir is supplied, it wil position itself between the target and the center of the goal
function _centerBackPos(targetPos: Position, targetDir?: RelativePosition): [Position, number, number | undefined] {
	let dist = centerBackDistanceToDefenseArea() + Constants.maxRobotRadius;
	if (targetDir != undefined) {
		// use targetPos even if it is slightly outside the field if it is going to be shot back in
		// don't rely on the autoref to disqualify this shot
		let [pos, way, sec] = Field.intersectRayDefenseArea(targetPos, targetDir, dist, true);
		if (pos) {
			return [pos, way, sec];
		}
	}
	targetPos = Field.limitToField(targetPos, -0.01);
	let dir = targetPos - World.Geometry.FriendlyGoal;
	let [pos, way, sec] = Field.intersectRayDefenseArea(World.Geometry.FriendlyGoal, dir, dist, true);
	return [pos || centerBackDefaultPos, way, sec];
}
export let centerBackPos: (targetPos: Position, targetDir?: RelativePosition) => [Position, number, number | undefined] =
	Cache.forFrame(_centerBackPos);

// if the ball will reach our defense area with at least that speed, stay defender
let DANGEROUS_BALL_SPEED = 3.0;
export function dangerousBallTowardsDefense(opp: boolean = false): boolean {
	// if the ball rolls towards our defense area with high speed, stay defender
	let defenseLineIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, 0, !opp)[0];
	if (defenseLineIntersection) {
		let timeToDefenseLine = Physics.ballRollTime(World.Ball,
			World.Ball.pos.distanceTo(defenseLineIntersection));
		let speedAtDefenseLine = Physics.ballAtTime(World.Ball, timeToDefenseLine).speed.length();
		if (speedAtDefenseLine > DANGEROUS_BALL_SPEED) {
			return true;
		}
	}
	return false;
}

export function getClosestRobot<R extends {pos: Position}>(robotlist: R[], pos: Position): [R | undefined, number] {
	let minDist = Infinity;
	let minRobot = undefined;
	for (let r of robotlist) {
		let dist = r.pos.distanceTo(pos);
		if (dist < minDist) {
			minDist = dist;
			minRobot = r;
		}
	}
	return [minRobot, minDist];
}

function _ratePassThreats(): Map<Robot, number> {
	let dangerousness: Map<Robot, number> = new Map<Robot, number>();
	let futureBallPos = Goal.predictShot()[0];
	for (let opp of World.OpponentRobots) {
		// TODO comment
		let angleBallOppGoal = (futureBallPos - opp.pos).absoluteAngleDiff(
			World.Geometry.FriendlyGoal - opp.pos);
		let angleOppGoalY = (opp.pos - World.Geometry.FriendlyGoal).absoluteAngleDiff(new Vector(0, 1));
		let distOppGoal = opp.pos.distanceTo(World.Geometry.FriendlyGoal);

		let ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 120 * Math.PI / 180, 80 * Math.PI / 180);
		let ratingAngleOppGoalY = Rating.valueToRating(angleOppGoalY, 85 * Math.PI / 180, 70 * Math.PI / 180);
		let ratingDistOppGoal = Rating.valueToRating(distOppGoal,
			World.Geometry.FieldHeight * 0.85, World.Geometry.FieldHeight * 0.4);

		let rating = ratingAngleBallOppGoal * ratingAngleOppGoalY * ratingDistOppGoal;
		dangerousness.set(opp, rating);
	}
	return dangerousness;
}
export let ratePassThreats: () => Map<Robot, number> = Cache.forFrame(_ratePassThreats);

function _rateVolleyGoalShotThreats(): Map<Robot, number> {
	let dangerousness: Map<Robot, number> = new Map<Robot, number>();
	if (World.Ball.speed.length() > 1.5) {
		for (let opp of World.OpponentRobots) {
			let rating = 1;
			if (!ObserverRobot.hadBall(opp, 0.2)) {
				let angleBallOppGoal = (World.Ball.pos - opp.pos).absoluteAngleDiff(
						World.Geometry.FriendlyGoal - opp.pos);
				let angleBallSpeedOpp = World.Ball.speed.absoluteAngleDiff(opp.pos - World.Ball.pos);
				let ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 85 * Math.PI / 180, 65 * Math.PI / 180);
				let ratingAngleBallSpeedOpp = Rating.valueToRating(angleBallSpeedOpp, 45 * Math.PI / 180, 30 * Math.PI / 180);
				rating = ratingAngleBallOppGoal * ratingAngleBallSpeedOpp;
			}
			let absAngleOppDirGoal = Math.abs(geom.normalizeAngle(
					opp.dir - (World.Geometry.FriendlyGoal - opp.pos).angle()));
			let ratingAbsAngleOppDirGoal = Rating.valueToRating(absAngleOppDirGoal, 60 * Math.PI / 180, 20 * Math.PI / 180);
			dangerousness.set(opp, rating * ratingAbsAngleOppDirGoal);
		}
	}
	return dangerousness;
}
export let rateVolleyGoalShotThreats: () => Map<Robot, number> = Cache.forFrame(_rateVolleyGoalShotThreats);

function rateProximityThreats(): Map<Robot, number> {
	let dangerousness: Map<Robot, number> = new Map<Robot, number>();
	for (let opp of World.OpponentRobots) {
		dangerousness.set(opp, 0.01 * Rating.valueToRating(opp.pos.distanceTo(World.Geometry.FriendlyGoal), World.Geometry.FieldHeightHalf, 0));
	}
	return dangerousness;
}

function _rateOpponentDangerousness(): Map<Robot, number> {
	let passThreats = ratePassThreats();
	let goalThreats = rateVolleyGoalShotThreats();
	let proximityThreats = rateProximityThreats();

	let dangerousness: Map<Robot, number> = new Map<Robot, number>();
	for (let opp of World.OpponentRobots) {
		let passDangerousness = passThreats.get(opp) || 0;
		let goalDangerousness = goalThreats.get(opp) || 0;
		let proximityDangerousness = <number> proximityThreats.get(opp);
		dangerousness.set(opp, Math.max(passDangerousness, Math.max(goalDangerousness, proximityDangerousness)));
	}

	debug.set("dangerousness", dangerousness);
	return dangerousness;
}
export let rateOpponentDangerousness: () => Map<Robot, number> = Cache.forFrame(_rateOpponentDangerousness);

function _rateOpponentPassViability(): Map<Robot, number> {
	if (!amun.isPerformanceMode) {
		debug.push("Util Defense");
		debug.push("passViability");
	}

	let passViability: Map<Robot, number> = new Map<Robot, number>(); // opponent -> rating

	let ballPos = World.Ball.pos + World.Ball.speed / 2;
	for (let opp of World.OpponentRobots) {

		// ignore the ball owner
		if (opp.pos.distanceToSq(ballPos) < 0.5) {
			passViability.set(opp, 0);
			continue;
		}

		// ignore opponents close to enemy defense area
		if (opp.pos.y > G.FieldHeightHalf - G.DefenseHeight - 1) {
			passViability.set(opp, 0);
			continue;
		}

		// ignore opponents that are too close to the defense area
		if (Field.distanceToDefenseAreaSq(opp.pos, true) < 1.5 * 1.5) {
			passViability.set(opp, 0);
			continue;
		}

		// ignore opponents that are too close to the defense area
		if (Field.distanceToDefenseAreaSq(opp.pos, true) < 1.5 * 1.5) {
			passViability.set(opp, 0);
			continue;
		}

		// ignore opponents that are behind the ball
		if (opp.pos.y - World.Ball.pos.y > 2 * Constants.maxRobotRadius) {
			passViability.set(opp, 0);
			continue;
		}

		// we can successfully intercept long passes more easily
		let distToBallOwner = opp.pos.distanceTo(ballPos);
		let distToBallOwnerRating = Rating.valueToRating(distToBallOwner, 2, 5);

		// we do not want the enemy to move the ball closer to our goal
		let minRating = 0.6;
		let distToGoal = opp.pos.y + opp.speed.y / 2 + G.FieldHeightHalf;
		let distToGoalRating = (1 - minRating) * Rating.valueToRating(distToGoal, G.FieldHeight - G.DefenseHeight, G.DefenseHeight + 1) + minRating;

		let rating = distToGoalRating * distToBallOwnerRating;
		passViability.set(opp, rating);

		if (Ball.receivesPass(opp)) {
			rating = rating + 0.5;
		}

		if (!amun.isPerformanceMode) {
			debug.push(String(opp.id));
			debug.set("distToBallOwnerRating", distToBallOwnerRating);
			debug.set("distToGoalRating", distToGoalRating);
			debug.set("total rating", rating);
			debug.pop();
		}
	}

	if (!amun.isPerformanceMode) {
		debug.pop();
		debug.pop();
	}

	debug.set("passViability", passViability);
	return passViability;
}
export let rateOpponentPassViability: () => Map<Robot, number> = Cache.forFrame(_rateOpponentPassViability);

// this function searches for a position between boundaryOne and boundaryTwo to which the robot will take
// the shortest amount of time, up to a precision value, using a ternary algorithm
export function findBestPointToBlockOpponentShot(robot: FriendlyRobot, boundaryOne: Position, boundaryTwo: Position,
		timeToBoundaryOne: number, timeToBoundaryTwo: number, precision: number): Position {
	// time diff between the two bounds
	if (Math.abs(timeToBoundaryOne - timeToBoundaryTwo) < precision ||
			boundaryOne.distanceTo(boundaryTwo) < 0.005) {
		return boundaryOne;
	}

	// calculate two new positions on the line
	let leftThird = (boundaryOne * 2 + boundaryTwo) / 3;
	let rightThird = (boundaryOne + boundaryTwo * 2) / 3;

	// calculate time to the new positions
	let timeToLeftThird = Physics.robotTimeToPos(robot, leftThird, new Vector(0, 0))[0];
	let timeToRightThird = Physics.robotTimeToPos(robot, rightThird, new Vector(0,0))[0];

	// depending on which time is smaller recursively call the function with new boundaries
	if (timeToLeftThird < timeToRightThird) {
		return findBestPointToBlockOpponentShot(robot, boundaryOne, rightThird, timeToBoundaryOne, timeToRightThird, precision);
	} else {
		return findBestPointToBlockOpponentShot(robot, leftThird, boundaryTwo, timeToLeftThird, timeToBoundaryTwo, precision);
	}
}

// this function calculates a new position between boundaryOne and boundaryTwo regarding the oldPosition
export function fastestPointInInterval(robot: FriendlyRobot, boundaryOne: Position, boundaryTwo: Position,
		oldPos: Position | undefined, precision: number, blockAlpha: number): Position {
	// time to the boundaries
	let timeToBoundaryOne = Physics.robotTimeToPos(robot, boundaryOne, new Vector(0, 0))[0];
	let timeToBoundaryTwo = Physics.robotTimeToPos(robot, boundaryTwo, new Vector(0, 0))[0];

	let newPos = findBestPointToBlockOpponentShot(robot, boundaryOne, boundaryTwo, timeToBoundaryOne, timeToBoundaryTwo, precision);
	if (oldPos) {
		oldPos = oldPos.nearestPosOnLine(boundaryOne, boundaryTwo);
	} else {
		oldPos = newPos;
	}

	// don't let the postion jump to much between frames
	return newPos * blockAlpha + oldPos * (1 - blockAlpha);
}

function calculateDefenseCornerFactor(robot_radius: number, buffer: number, distance: number): number {
	let distanceRHalf = robot_radius + buffer / 2;
	let extraDistance = distance + robot_radius;
	return distanceRHalf / extraDistance / Math.asin(distanceRHalf / extraDistance);
}
export let cornerFactor = calculateDefenseCornerFactor(0.09, 0.02, 0.08);

// sec - Sector:
// 2  3  4
// 1     5
export function mulCornerFactor(way: number, sec: number, distance: number) {
	let defenseHeight = G.DefenseHeight;
	let defenseWidth = G.DefenseWidth;
	let factor = cornerFactor;

	switch (sec) {
		case 1:
			return way;
		case 2:
			return defenseHeight + (way - defenseHeight) * factor;
		case 3:
			return way + (Math.PI / 2 * distance * (factor - 1));
		case 4:
			return defenseHeight + defenseWidth + (way - defenseHeight - defenseWidth) * factor;
		case 5:
			return way + (Math.PI * distance * (factor - 1));
		default:
			throw new Error(`Invalid sector: ${sec}`);
	}
}
export function divCornerFactor(way: number, distance: number): number {
	let defenseHeight = G.DefenseHeight;
	let defenseWidth = G.DefenseWidth;
	let factor = cornerFactor;
	let corner = distance * Math.PI / 2;
	let maxCornerWay = corner * factor;
	let restWay = way;

	if (restWay <= defenseHeight) {
		return restWay;
	}
	restWay = restWay - defenseHeight;

	if (restWay <= maxCornerWay) {
		return defenseHeight + restWay / factor;
	}
	restWay = restWay - maxCornerWay;

	if (restWay <= defenseWidth) {
		return defenseHeight + corner + restWay;
	}
	restWay = restWay - defenseWidth;

	if (restWay <= maxCornerWay) {
		return defenseHeight + defenseWidth + corner + restWay / factor;
	}
	restWay = restWay - maxCornerWay;
	return defenseHeight + defenseWidth + corner * 2 + restWay;
}
