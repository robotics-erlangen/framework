import * as Field from "base/field";
import { Robot } from "base/robot";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class BallEscort extends Task {
	private _opponentRobot: Robot | undefined;
	private _obstacleTable: PathHelper.PathHelperParameters;

	constructor(behavior: Behavior, opponentRobot: Robot | undefined) {
		super(behavior);
		this._opponentRobot = opponentRobot;
		this._obstacleTable = {
			ignoreBall: false,
			extraBallDistance: 0.25,
			ignorePass: true,
			task: this,
		};
	}

	public run() {
		let target = this._opponentRobot ? this._opponentRobot.pos : World.Geometry.FriendlyGoal;
		let pos = World.Ball.pos + (target - World.Ball.pos).withLength(0.3 + this._robot.radius);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed);
		if (ballOutPos) {
			this._robot.path.addLine(World.Ball.pos.x, World.Ball.pos.y, ballOutPos.x, ballOutPos.y, this._robot.radius,
				"Ballescort", PathHelper.PRIORITIES.INNER_BALL);
		}

		this._robot.trajectory.update(ToTarget, pos, (this._robot.pos - World.Ball.pos).angle());
	}
}
