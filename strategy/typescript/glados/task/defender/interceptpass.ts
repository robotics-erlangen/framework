import * as Cache from "base/cache";
import * as Field from "base/field";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


function evaluateInterceptPos(robot: FriendlyRobot, pos: Position): [number, number, number | undefined] {
	const OPP_EXTRA_TIME = 0.05;

	// checks if the pos is behind our robot
	if (pos.y < robot.pos.y + 2 * robot.radius) {
		return [-Infinity, Infinity, undefined];
	}

	// checks if the pos is in the allowed field
	if (!Field.isInAllowedField(pos, -2 * robot.radius)) {
		return [-Infinity, Infinity, undefined];
	}

	let ownTime = Physics.robotTimeToPos(robot, pos, (pos - robot.pos).withLength(robot.maxSpeed))[0];
	let bestOppTime = Infinity;

	// search the closest opponent
	for (let oppRobot of World.OpponentRobots) {
		if (oppRobot.pos.distanceTo(pos) < 3 * robot.pos.distanceTo(pos)) {
			let oppTime = Physics.robotTimeToPos(oppRobot, pos, (pos - oppRobot.pos).withLength(robot.maxSpeed))[0];
			if (oppTime < ownTime + OPP_EXTRA_TIME) {
				return [-Infinity, ownTime, bestOppTime];
			}

			bestOppTime = Math.min(bestOppTime, oppTime);

		}
	}

	return [bestOppTime - ownTime, ownTime, bestOppTime];

}

function calculateInterceptPos(robot: FriendlyRobot): [Position | undefined, number | undefined, number, number] {
	const BALL_EXTRA_TIME = 0.05;
	const HYST_TIME = 0.1;

	// make sure the last position is reasonable and valid
	if (lastPositions.has(robot) && World.Ball.speed.lengthSq() > 0.5 * 0.5) {
		const [lastPos, lastTime] = <[Position, number]> lastPositions[robot];
		const [pos, dist] = lastPos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed);
		if (dist > 0.2 || World.Time - lastTime > 0.5  ||
				World.Ball.speed.dot(lastPos - World.Ball.pos) < -0.1) {
			lastPositions.delete(robot);
		} else {
			lastPositions[robot] = [pos, World.Time];
		}
	}

	// evaluate a few positions on the line
	const minTime = Robot.minTimeToBall(robot) + BALL_EXTRA_TIME;
	const ballOutTime = Physics.ballOutTime(World.Ball, 0);
	const [predictedBallOriginPos, _, _2, passReceiver] = Goal.predictShot(false, false);
	if (passReceiver == undefined) {
		throw new Error("InterceptPass is running with no pass to intercept");
	}
	const minTimeToOpp = Physics.ballTravelTime(World.Ball, predictedBallOriginPos.distanceTo(World.Ball.pos));
	const maxTime = Math.min(ballOutTime, minTimeToOpp);

	let bestPos: Position | undefined;
	let bestRating = -Infinity;
	let bestRatingOppTime = Infinity;
	let posTime: number | undefined;
	for (let i = -1;i <= 10;i++) {
		let futureBallPos: Position | undefined;
		let rating = 0;

		// reevaluate the previous result
		if (i === -1) {
			rating = rating + (lastPositions[robot] != undefined ? HYST_TIME : 0);
			if (lastPositions.has(robot)) {
				futureBallPos = (lastPositions[robot] as [Position, number])[0];
			} else {
				i = i + 1;
			}
		}

		let useTime = minTime + i * (maxTime - minTime) / 10;
		futureBallPos = futureBallPos || Physics.ballAtTime(World.Ball, useTime).pos;

		let [evaluation, ownTime, bestOppTime] = evaluateInterceptPos(robot, futureBallPos);

		if (evaluation >= 0) {
			rating = rating + evaluation; // TODO consider endspeed together with the current time advantage
			if (rating > bestRating) {
				bestRating = rating;
				bestPos = futureBallPos;
				posTime = ownTime;
				bestRatingOppTime = <number> bestOppTime;
			}
		}
	}

	if (bestPos) {
		lastPositions[robot] = [bestPos, World.Time];
	} else {
		lastPositions.delete(robot);
	}

	return [bestPos, posTime, bestRatingOppTime, bestRating];
}

const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true,
	ignoreOpponentRobots: true,
};

// lastPositions[robot][0] - Vector pos
// lastPositions[robot][1] - number time (of pos)
let lastPositions = new Map<FriendlyRobot, [Position, number]>();

export class InterceptPass extends Task {

	static calculateInterceptPos: (robot: FriendlyRobot) => [Position | undefined, number | undefined, number, number] =
		Cache.forFrame(calculateInterceptPos);

	run() {
		let [moveDest, time, oppTime] = InterceptPass.calculateInterceptPos(this._robot);

		if (moveDest == undefined) {
			let dribblerPos = this._robot.pos + Vector.fromPolar(this._robot.dir, this._robot.shootRadius + World.Ball.radius);
			moveDest = dribblerPos.nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3);
			time = Physics.robotTimeToPos(this._robot, moveDest, moveDest.withLength(this._robot.maxSpeed * 0.5))[0];
			let firstEnemy = Ball.firstRobotAtBall(World.OpponentRobots)[0];
			if (firstEnemy == undefined) {
				oppTime = Infinity;
			} else {
				let nearestPosOnLine = firstEnemy.pos.nearestPosOnLine(
							World.Ball.pos, World.Ball.pos + World.Ball.speed * 3);
				oppTime = Physics.checkedBallTravelTime(World.Ball, nearestPosOnLine);
			}
		}

		let ballTime = Physics.ballTravelTime(World.Ball, World.Ball.pos.distanceTo(moveDest));

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let dir = (-World.Ball.speed).angle();
		let endSpeed = Physics.robotMinEndspeed(this._robot, moveDest, ballTime);

		if (time != undefined && oppTime - time > 0.3 && time < 0.8) {
			this.setMainAttackerParameters(World.Ball.pos, endSpeed.length());
			this.behavior()._applyForMainAttacker();
		}

		this._robot.trajectory.update(ToTarget, moveDest, dir, undefined, endSpeed);
	}
}
