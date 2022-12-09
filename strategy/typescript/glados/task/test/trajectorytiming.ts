import * as MathUtil from "base/mathutil";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as Physics from "glados/observer/physics";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import { TrajectoryPath } from "glados/trajectory/trajectorypath";

export class TrajectoryTiming extends Task {

	private currentTarget: Position = new Vector(0, 0);
	private driveStartTime: number = World.Time;
	private trajectoryPredictedTime: number = -1;
	private timeToPosPredictedTime: number = -1;
	private tryingToReachSpeed: boolean = false;
	private startingDistance: number = 0;

	private static _obstacleTable: PathHelper.PathHelperParameters = {
		ignoreBall: true,
		ignorePass: true
	};

	constructor(behavior: Behavior) {
		super(behavior);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, TrajectoryTiming._obstacleTable);

		let positionChanged = false;
		if (this.tryingToReachSpeed && this._robot.pos.distanceTo(this.currentTarget) < this.startingDistance * 0.5) {
			this.currentTarget = new Vector((MathUtil.random() * 2 - 1) * World.Geometry.FieldWidthHalf * 0.6,
				(MathUtil.random() * 2 - 1) * World.Geometry.FieldHeightHalf * 0.6);
			this.timeToPosPredictedTime = Physics.robotTimeToPos(this._robot, this.currentTarget, new Vector(0, 0))[0];
			this.driveStartTime = World.Time;
			this.tryingToReachSpeed = false;
			positionChanged = true;
		}
		if (!this.tryingToReachSpeed && this._robot.pos.distanceTo(this.currentTarget) < 0.02 && this._robot.speed.length() < 0.05) {
			// the robot reached the desired position
			if (this.timeToPosPredictedTime >= 0) {
				amun.log(`Trajectory error: ${this.trajectoryPredictedTime - (World.Time - this.driveStartTime)}`);
				amun.log(`RTTPos error: ${this.timeToPosPredictedTime - (World.Time - this.driveStartTime)}`);
			}
			this.currentTarget = new Vector((MathUtil.random() * 2 - 1) * World.Geometry.FieldWidthHalf * 0.6,
				(MathUtil.random() * 2 - 1) * World.Geometry.FieldHeightHalf * 0.6);
			this.tryingToReachSpeed = true;
			this.startingDistance = this._robot.pos.distanceTo(this.currentTarget);
		}

		let time = this._robot.trajectory.update(TrajectoryPath, this.currentTarget, 0)[1];
		if (positionChanged) {
			this.trajectoryPredictedTime = time;
		}
	}
}
