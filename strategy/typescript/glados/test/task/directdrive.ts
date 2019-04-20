import { Position } from "base/vector";

import { Agent, Task } from "glados/task/base";
import { ToTarget } from "glados/trajectory/totarget";

// does nothing but call trajectory update to the given position
export class DirectDrive extends Task {
	private pos: Position;

	constructor(agent: Agent, pos: Position) {
		super(agent);
		this.pos = pos;
	}

	public run() {
		this._robot.trajectory.update(ToTarget, this.pos);
	}
}
