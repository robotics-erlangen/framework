import { Position, Vector } from "base/vector";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import { CatchBall } from "glados/task/ability/catchball";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";

// Warning: This task has some very strict precoditions.
// 1. It will only work if you have the ball in the dribbler at the start
// 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}).absoluteAngleDiff(viewDir) is pretty small

let obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true
};

export class Dribble extends Task {
	private _pos: Position;
	private _dir: number;
	private _suggestPassFlag: boolean;
	private _endSpeedLength: number;

	private _catchBall: CatchBall;
	private _suggestPass: SuggestPass;

	constructor(agent: Agent, pos: Position, suggestPass: boolean = false, endSpeedLength: number = 0) {
		super(agent);
		this._pos = pos;
		this._dir = (pos - this._robot.pos).angle();
		this._suggestPassFlag = suggestPass;
		this._endSpeedLength = endSpeedLength;

		this._catchBall = new CatchBall(this._robot, this._messaging);
		this._suggestPass = new SuggestPass(this._robot, this._messaging);
	}

	run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.setDribblerSpeed(0.7);

		let time;
		if (World.Ball.pos.distanceTo(this._robot.pos) > this._robot.radius + World.Ball.radius + 0.05) {
			let catchTime = this._catchBall._catchBall(this._pos, 0);
			time = catchTime + Physics.robotTimeToPos(this._robot, this._pos, new Vector(0, 0))[0];
		} else {
			let endSpeed = (this._pos - this._robot.pos).setLength(this._endSpeedLength);
			time = this._robot.trajectory.update(CurvedMaxAccel, this._pos, this._dir, 1.0, endSpeed, undefined, true)[1];
		}


		if (this._suggestPassFlag) {
			this._suggestPass._suggestPass(this._pos, undefined, time);
		}
	}
}
