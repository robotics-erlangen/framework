import * as debug from "base/debug";
import {FriendlyRobot} from "base/robot";
import * as World from "base/world";


let FORCE_SHOOT_DELAY = 0.03; // delay forced kick by this time
let ENABLE_FORCE_SHOOT = false;

// when using this ability, make sure to set this._forceShootTimer to nil
// if the kick was canceled but the task stays active

export class ForceShoot {
	public _forceShootTimer: number | undefined;

	private _robot: FriendlyRobot;

	constructor (robot: FriendlyRobot) {
		this._robot = robot;
	}

	public _doForceShoot () {
		if (this._robot.radioResponse) {
			debug.set("light barrier", this._robot.radioResponse.ball_detected);
		}
		if (!ENABLE_FORCE_SHOOT) {
			return;
		}
		// Ignore the IR if the robot has the ball
		let relpos = (World.Ball.pos - this._robot.pos).rotate(-this._robot.dir);
		// assume the ball is "pushed" into the robot due to tracking latency
		if (relpos.x < this._robot.shootRadius + World.Ball.radius - 0.002 && World.Ball.isPositionValid() &&
				this._robot.hasBall(World.Ball, -0.01)) {
			// initialize if neccessary
			this._forceShootTimer = this._forceShootTimer || World.Time;
			if (World.Time - this._forceShootTimer >= FORCE_SHOOT_DELAY) {
				debug.set("force shoot", true);
				this._robot.forceShoot();
			}
		} else {
			// reset time
			this._forceShootTimer = World.Time;
		}
	}
}