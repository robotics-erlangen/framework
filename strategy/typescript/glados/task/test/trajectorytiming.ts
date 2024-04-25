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

	private _currentTarget: Position = new Vector(0, 0);
	private _driveStartTime: number = World.Time;
	private _trajectoryPredictedTime: number = -1;
	private _timeToPosPredictedTime: number = -1;
	private _tryingToReachSpeed: boolean = false;
	private _startingDistance: number = 0;

	private static _obstacleTable: PathHelper.PathHelperParameters = {
		ignoreBall: true,
		ignorePass: true
	};

	public constructor(behavior: Behavior) {
		super(behavior);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, TrajectoryTiming._obstacleTable);

		let positionChanged = false;
		if (this._tryingToReachSpeed && this._robot.pos.distanceTo(this._currentTarget) < this._startingDistance * 0.5) {
			this._currentTarget = new Vector((MathUtil.random() * 2 - 1) * World.Geometry.FieldWidthHalf * 0.6,
				(MathUtil.random() * 2 - 1) * World.Geometry.FieldHeightHalf * 0.6);
			this._timeToPosPredictedTime = Physics.robotTimeToPos(this._robot, this._currentTarget, new Vector(0, 0))[0];
			this._driveStartTime = World.Time;
			this._tryingToReachSpeed = false;
			positionChanged = true;
		}
		if (!this._tryingToReachSpeed && this._robot.pos.distanceTo(this._currentTarget) < 0.02 && this._robot.speed.length() < 0.05) {
			// the robot reached the desired position
			if (this._timeToPosPredictedTime >= 0) {
				amun.log(`Trajectory error: ${this._trajectoryPredictedTime - (World.Time - this._driveStartTime)}`);
				amun.log(`RTTPos error: ${this._timeToPosPredictedTime - (World.Time - this._driveStartTime)}`);
			}
			this._currentTarget = new Vector((MathUtil.random() * 2 - 1) * World.Geometry.FieldWidthHalf * 0.6,
				(MathUtil.random() * 2 - 1) * World.Geometry.FieldHeightHalf * 0.6);
			this._tryingToReachSpeed = true;
			this._startingDistance = this._robot.pos.distanceTo(this._currentTarget);
		}

		let time = this._robot.trajectory.update(TrajectoryPath, this._currentTarget, 0)[1];
		if (positionChanged) {
			this._trajectoryPredictedTime = time;
		}
	}
}
