import { Position } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import { ToTarget } from "glados/trajectory/totarget";

// does nothing but call trajectory update to the given position
export class DirectDrive extends Task {
	private _pos: Position;

	public constructor(behavior: Behavior, pos: Position) {
		super(behavior);
		this._pos = pos;
	}

	public run() {
		this._robot.trajectory.update(ToTarget, this._pos);
	}
}
