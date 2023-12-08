import * as Cache from "base/cache";
import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as Attack from "glados/util/attack";


/**
 * Calculates the position to break the pass
 * @param robot - The robot that should break the pass
 * @returns Position to break the pass (breakPos)
 * @returns Endspeed of the roboter (endSpeed)
 * @returns Time to wait for break the pass (waitingTime)
 */
function calculateBreakPos(robot: FriendlyRobot): [Position, Speed, number] {

	// ToDo: Unterscheidung zwischen stehenden Gegener und sich bewegenden


	// calculate break position
	let possibleBreakPos: Vector[] = [];
	if (World.Ball.speed.lengthSq() > 0 && robot.speed.lengthSq() > 0) {
		let [intersectBreakPos, _, _2] = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, robot.pos, robot.speed);

		// We might have a lot of speed when catching the Ball, so don't risk reflections towards our goal
		// Also consider case where we are currently moving away from the passLine
		if (intersectBreakPos && (intersectBreakPos - robot.pos).y >= 0 && (intersectBreakPos - robot.pos).dot(robot.speed) >= 0) {
			possibleBreakPos.push(intersectBreakPos);
		}
	}
	let orthoBreakPos = robot.pos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)[0];
	possibleBreakPos.push(orthoBreakPos);

	let bestBreakPos: Vector | undefined = undefined;
	let bestMinEndSpeed: Vector | undefined = undefined;
	let bestWaitingTime: number | undefined = undefined;
	for (let breakPos of possibleBreakPos) {
		// calculate end speed
		let ballTimeToPos = Physics.ballTravelTime(World.Ball, breakPos.distanceTo(World.Ball.pos));
		let minEndSpeed = Physics.robotMinEndspeed(robot, breakPos, ballTimeToPos);

		// calculate waiting time
		let timeToPos = Physics.robotTimeToPos(robot, breakPos, minEndSpeed)[0];
		let waitingTime = ballTimeToPos - timeToPos;

		if (bestWaitingTime == undefined || waitingTime > bestWaitingTime) {
			bestWaitingTime = waitingTime;
			bestMinEndSpeed = minEndSpeed;
			bestBreakPos = breakPos;
		}
	}

	return [bestBreakPos!, bestMinEndSpeed!, bestWaitingTime!];
}


const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true
};

export class BreakPass extends Task {
	public static readonly BUFFER_TIME = 0.7;

	public static calculateBreakPos: (robot: FriendlyRobot) => [Position, Speed, number] =
		Cache.forFrame(calculateBreakPos);

	public run() {

		let [moveDest, endSpeed, waitingTime] = BreakPass.calculateBreakPos(this._robot);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		if (this._robot.pos.distanceTo(World.Ball.pos) < 0.5) {
			this.setMainAttackerParameters(World.Ball.pos, 0);
			this.behavior().applyForMainAttacker();
			Attack.cancelCurrentPlannedMainAttacker();
		}

		let robotEndDir = -World.Ball.speed;

		if (this._robot.pos.distanceToSq(moveDest) < 2 * 2 * this._robot.radius * this._robot.radius &&
			World.Ball.pos.distanceToSq(moveDest) >= 1.5 * this._robot.pos.distanceToSq(moveDest)) {
			endSpeed = new Vector(0, 0);
		}

		this._robot.trajectory.update(ToTarget, moveDest, robotEndDir.angle(), undefined, endSpeed);
	}
}
