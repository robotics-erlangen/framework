import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { Task } from "glados/task/base";
import { CurvedMaxAccel as ToTarget } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";


export class MoveToStaticBall extends Task {
	private _rotation: number;
	private _distanceToBall: number;
	private _obstacleTable: PathHelper.PathHelperParameters;

	constructor(behavior: Behavior, rotation = Math.PI / 2, distanceToBall = 0.03) {
		super(behavior);
		this._rotation = rotation;
		this._distanceToBall = distanceToBall;
		// slightly smaller obstacle to avoid that the target position is in the obstacle (by float standards)
		this._obstacleTable = {extraBallDistance: this._distanceToBall - 0.001, ignorePass: true, ignorePenaltyDistance: true};
	}

	run() {
		let absDistToBall = this._distanceToBall + this._robot.radius + World.Ball.radius;
		let pos = World.Ball.pos - Vector.fromPolar(this._rotation, absDistToBall);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		this._robot.trajectory.update(ToTarget, pos, this._rotation);

		// send the position of the ball
		this._messaging.sendBroadcast(MessageType.attackPosition, World.Ball.pos);
	}
}
