import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Task } from "glados/task/base";
import { Direct } from "glados/trajectory/direct";
import * as Rating from "glados/util/rating";


export class PerfectDribblerRotateAndShoot {

	private _robot: FriendlyRobot;

	public constructor(task: Task) {
		this._robot = task.behavior().agent().robot();
	}

	public rotateAndShoot(destAngle: number) {

		let invert = this._robot.dir < destAngle ? 1 : -1;
		let maxRotate = 0.4 * (2 * Math.PI) * invert;
		let rotate = Rating.valueToRating(
			Math.abs(geom.getAngleDiff(destAngle, this._robot.dir)), geom.degreeToRadian(2), geom.degreeToRadian(20)
		) * maxRotate;

		if (Math.abs(geom.getAngleDiff(this._robot.dir, destAngle)) < geom.degreeToRadian(8)) {
			this._robot.setDribblerSpeed(0);
			this._robot.shoot(Infinity);
			this._robot.trajectory.update(Direct,
				(World.Ball.pos - this._robot.pos).withLength(1),
				undefined, 0);
		} else {
			this._robot.setDribblerSpeed(1);
			this._robot.trajectory.update(Direct,
				new Vector(0, 0), undefined, rotate);
		}
	}
}
