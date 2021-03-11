import { Speed, Vector } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";


interface Ball {
	speed: Speed;
}

export class PenaltyShootout extends Task {
	private _shoot: Shoot;

	private _ball : Ball;

	constructor(behavior: Behavior, ball: Ball) {
		super(behavior);
		this._ball = ball;
		this._shoot = new Shoot(this);
	}

	run() {
		const obstacleTable = {
			task: this,
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let shootlength = (0.2 + this._robot.speed.length() * 0.4);
		let shootpos = new Vector(0, shootlength) * 0.7 + this._ball.speed / 3 * 0.3;
		shootpos = shootpos.withX(-shootpos.x / 2);
		this._shoot._shoot(shootpos + this._robot.pos, shootlength);
	}
}
