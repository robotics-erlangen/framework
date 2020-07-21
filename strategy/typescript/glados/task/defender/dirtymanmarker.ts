import { Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Defense from "glados/util/defense";
let G = World.Geometry;

const MANMARKDISTANCE = 0.3;
const SPEEDOFFSET = 0.07;

export class DirtyManMarker extends Task {
	private targetRobot: Robot;
	private obstacleTable: PathHelper.PathHelperParameters;
	private dir: number | undefined;
	private direction: Vector | undefined;
	private oldpos: Vector | undefined;

	constructor(behavior: Behavior, targetRobot: Robot) {
		super(behavior);

		this.targetRobot = targetRobot;
		this.obstacleTable = {
			ignoreBall: false,
			messaging: this._messaging
		};
	}

	public run() {
		let pos = new Vector(0,0);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this.obstacleTable);

		if (this.targetRobot.speed.length() < 0.2) {
			this.direction = World.Ball.pos - this.targetRobot.pos;
			pos = this.targetRobot.pos + this.direction.withLength(MANMARKDISTANCE);

		} else {
			let boundaryOne = this.targetRobot.pos + this.targetRobot.speed.withLength(MANMARKDISTANCE + this.targetRobot.speed.length() * SPEEDOFFSET);
			let boundaryTwo = this.targetRobot.pos + this.targetRobot.speed.withLength(3 + this.targetRobot.speed.length() * SPEEDOFFSET);
			let blockalpha;
			if (this.oldpos == undefined) {
				blockalpha = 1;
			} else {
				blockalpha = 0.1;
			}
			pos = Defense.fastestPointInInterval(this._robot, boundaryOne, boundaryTwo, this.oldpos || new Vector(0, 0), 0.1, blockalpha);
			this.oldpos = pos;
		}
		this._robot.trajectory.update(CurvedMaxAccel, pos, this.dir);
	}
}
