import { Position } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";

export class ChipToPos extends Task {
	private _firstContactPos: Position;
	private _targetTime: number;
	private _ballReceiptPos: Position | undefined;
	private _chipPrecision: number | undefined;

	private _shoot: Shoot;

	constructor(behavior: Behavior, firstContactPos: Position, targetTime: number, ballReceiptPos?: Position, precision?: number) {
		super(behavior);
		this._firstContactPos = firstContactPos;
		this._targetTime = targetTime;
		this._ballReceiptPos = ballReceiptPos;
		this._chipPrecision = precision;

		this._shoot = new Shoot(this._robot, this._messaging, this.capturedSetMAParams());
	}

	public run() {
		let obstacleTable = {
			messaging: this._messaging
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._shoot._chipToPos(this._firstContactPos, this._targetTime, this._ballReceiptPos, this._chipPrecision);
	}
}
