import { Position } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";

export class TestShoot extends Task {
	private _shoot: Shoot;
	private _targetPos: Position;
	private _targetSpeed: number;

	public constructor(behavior: Behavior, targetPos: Position, targetSpeed: number) {
		super(behavior);
		this._targetPos = targetPos;
		this._targetSpeed = targetSpeed;
		this._shoot = new Shoot(this);
	}

	public run(): void {
		let obstacleTable = {
			task: this
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._shoot.shoot(this._targetPos, this._targetSpeed);
	}
}
