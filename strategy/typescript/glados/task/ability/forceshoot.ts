import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Task } from "glados/task/base";

const FORCE_SHOOT_DELAY = 0.03; // delay forced kick by this time
const ENABLE_FORCE_SHOOT = false;

// when using this ability, make sure to set this._forceShootTimer to nil
// if the kick was canceled but the task stays active

export class ForceShoot {
	public forceShootTimer: number | undefined;

	private _robot: FriendlyRobot;

	public constructor(task: Task) {
		this._robot = task.behavior().agent().robot();
	}

	public doForceShoot() {
		if (this._robot.radioResponse) {
			debug.set("light barrier", this._robot.radioResponse.ball_detected);
		}
		if (!ENABLE_FORCE_SHOOT) {
			return;
		}
		// Ignore the IR if the robot has the ball
		let relpos = (World.Ball.pos - this._robot.pos).rotated(-this._robot.dir);
		// assume the ball is "pushed" into the robot due to tracking latency
		if (relpos.x < this._robot.shootRadius + World.Ball.radius - 0.002 && World.Ball.isPositionValid() &&
				this._robot.hasBall(World.Ball, -0.01)) {
			// initialize if neccessary
			this.forceShootTimer = this.forceShootTimer != undefined ? this.forceShootTimer : World.Time;
			if (World.Time - this.forceShootTimer >= FORCE_SHOOT_DELAY) {
				debug.set("force shoot", true);
				this._robot.forceShoot();
			}
		} else {
			// reset time
			this.forceShootTimer = World.Time;
		}
	}
}
