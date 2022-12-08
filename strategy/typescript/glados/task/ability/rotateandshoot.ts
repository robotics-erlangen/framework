import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import { Task } from "glados/task/base";
import { Direct } from "glados/trajectory/direct";


export class RotateAndShoot {
	_RAS_startTime: number | undefined;

	_robot: FriendlyRobot;

	constructor(task: Task) {
		this._robot = task.behavior().agent().robot();
	}

	_rotateAndShoot(destAngle: number, customPos: Position = World.Ball.pos) {
		if (this._RAS_startTime == undefined) {
			this._RAS_startTime = World.Time;
		}
		let t = World.Time - this._RAS_startTime;

		// 1 when rotating ccw, -1 when rotating cw
		let invert = this._robot.dir < destAngle ? 1 : -1;
		let toBall = (customPos - this._robot.pos).normalized();
		let sidewards = toBall.perpendicular() * invert;


		let vf_min = 0.5, vf_max = 2.0, vf_t = 0.2;
		let vs_min = 0.5, vs_max = 2.0, vs_t = 0.1;
		let vf = MathUtil.bound(vf_min, t * vf_max / vf_t, vf_max);
		let vs = MathUtil.bound(vs_min, (vs_t - t) * vs_max / vs_t, vs_max);

		// HACK
		if (t < 0.12) {
			vf = 0;
		}

		let rotate = 0.4 * (2 * Math.PI) * invert;
		// if (Math.abs(geom.getAngleDiff(this._robot.dir, destAngle)) < 8 * Math.PI / 180) {
		this._robot.shoot(Infinity);
		// }


		let move = toBall * vf + sidewards * vs;
		this._robot.trajectory.update(Direct, move, undefined, rotate);
		this._robot.setDribblerSpeed(0.7);
	}
}
