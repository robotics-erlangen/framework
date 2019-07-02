import * as Cache from "base/cache";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import * as Piggy from "glados/agent/defender/piggy";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


/// Calculates the position to break the pass
// @param robot FriendlyRobot - the robot that should break the pass
// @return Position - position to break the pass (breakPos)
// @return Speed - endspeed of the roboter (endSpeed)
// @return number - time to wait for break the pass (waitingTime)
function calculateBreakPos(robot: FriendlyRobot): [Position, Speed, number] {

	// ToDo: Unterscheidung zwischen stehenden Gegener und sich bewegenden


	// calculate break position
	let breakPos = robot.pos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)[0];

	// calculate end speed
	let ballTimeToPos = Physics.ballTravelTime(World.Ball, breakPos.distanceTo(World.Ball.pos));
	let minEndSpeed = Physics.robotMinEndspeed(robot, breakPos, ballTimeToPos);

	// calculate waiting time
	let timeToPos = Physics.robotTimeToPos(robot, breakPos, minEndSpeed)[0];
	let waitingTime = ballTimeToPos - timeToPos;

	return [breakPos, minEndSpeed, waitingTime];
}


const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true,
	ignoreOpponentRobots: true,
};


export class BreakPass extends Task {
	static BUFFER_TIME = 0.7;

	static calculateBreakPos: (robot: FriendlyRobot) => [Position, Speed, number] =
		Cache.forFrame(calculateBreakPos);

	run() {

		// Gegner bewegt sich / bewegt sich nicht
		/// Unterscheidung ..
		// Ball bewegt sich / bewegt sich nicht
		/// nicht: ausgehen
		// Ball wird zu targetRobot geschossen
		/// nicht: ausgehen
		if (World.Ball.speed.length() < 0.5) {
			// todo: abbrechen
		}

		let [moveDest, endSpeed, waitingTime] = BreakPass.calculateBreakPos(this._robot);
		let robotEndDir = -World.Ball.speed;

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		this._robot.trajectory.update(ToTarget, moveDest, robotEndDir.angle(), undefined, endSpeed);
	}
}
