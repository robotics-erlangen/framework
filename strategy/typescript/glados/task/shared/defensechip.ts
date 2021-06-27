import * as debug from "base/debug";

import { Behavior } from "glados/agent/base/behavior";
import * as ObserverRobot from "glados/observer/robot";
import { ForceShoot } from "glados/task/ability/forceshoot";
import { Task } from "glados/task/base";

export class DefenseChip extends Task {
	private forceShoot: ForceShoot;

	constructor(behavior: Behavior) {
		super(behavior);

		this.forceShoot = new ForceShoot(this);
	}

	public run() {
		if (!ObserverRobot.hadBall(this._robot, 0)) {
			this.forceShoot._forceShootTimer = undefined;
		}
		this.forceShoot._doForceShoot();
		this._robot.chip(2);
	}
}
