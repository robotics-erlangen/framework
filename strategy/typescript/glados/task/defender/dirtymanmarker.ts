import { Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Defense from "glados/util/defense";
const G = World.Geometry;

const MANMARKDISTANCE = 0.3;
const SPEEDOFFSET = 0.07;

export class DirtyManMarker extends Task {
	private _targetRobot: Robot;
	private _obstacleTable: PathHelper.PathHelperParameters;
	private _dir: number | undefined;
	private _direction: Vector | undefined;
	private _oldpos: Vector | undefined;

	public constructor(behavior: Behavior, targetRobot: Robot) {
		super(behavior);

		this._targetRobot = targetRobot;
		this._obstacleTable = {
			ignoreBall: false,
			task: this,
		};
	}

	public run() {
		let pos = new Vector(0, 0);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		if (this._targetRobot.speed.length() < 0.2) {
			this._direction = World.Ball.pos - this._targetRobot.pos;
			pos = this._targetRobot.pos + this._direction.withLength(MANMARKDISTANCE);

		} else {
			let boundaryOne = this._targetRobot.pos + this._targetRobot.speed.withLength(MANMARKDISTANCE + this._targetRobot.speed.length() * SPEEDOFFSET);
			let boundaryTwo = this._targetRobot.pos + this._targetRobot.speed.withLength(3 + this._targetRobot.speed.length() * SPEEDOFFSET);
			let blockalpha;
			if (this._oldpos == undefined) {
				blockalpha = 1;
			} else {
				blockalpha = 0.1;
			}
			pos = Defense.fastestPointInInterval(this._robot, boundaryOne, boundaryTwo, this._oldpos || new Vector(0, 0), 0.1, blockalpha);
			this._oldpos = pos;
		}
		this._robot.trajectory.update(CurvedMaxAccel, pos, this._dir);
	}
}
