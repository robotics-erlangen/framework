import { Coordinates } from "base/coordinates";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { TrajectoryHandler, TrajectoryResult } from "base/trajectory";
import { Speed, Vector } from "base/vector";

export class Direct extends TrajectoryHandler {

	// only targetDir or rotateSpeed may be passed!
	// accel is optional
	public update(speed: Speed, targetDir?: number, rotateSpeed?: number, accel: Vector = new Vector(0, 0)): TrajectoryResult {
		speed = Coordinates.toGlobal(speed);
		accel = Coordinates.toGlobal(accel);
		// play motion controller
		let robotSpeed = Coordinates.toGlobal(this._robot.speed);
		let k_v = 0.5;
		speed = speed + (speed - robotSpeed) * k_v;

		let robotPos = Coordinates.toGlobal(this._robot.pos);
		let robotDir = Coordinates.toGlobal(this._robot.dir);
		if (targetDir != undefined && rotateSpeed != undefined) {
			throw new Error("rotating while having a fixed direction makes no sense");
		}
		if (targetDir == undefined && rotateSpeed == undefined) {
			throw new Error("Either rotateSpeed or targetDir have to be set");
		}

		if (rotateSpeed == undefined) {
			let limitRot = 4 * Math.PI;
			let k_omega = 10;
			targetDir = Coordinates.toGlobal(<number> targetDir);
			let error_phi = geom.getAngleDiff(robotDir, <number> targetDir);
			rotateSpeed = MathUtil.bound(-limitRot, error_phi * k_omega, limitRot);
		}

		let spline = [{ t_start: 0, t_end: Infinity,
			x: { a0: robotPos.x, a1: speed.x, a2: accel.x / 2, a3: 0 },
			y: { a0: robotPos.y, a1: speed.y, a2: accel.y / 2, a3: 0 },
			phi: { a0: robotDir, a1: rotateSpeed, a2: 0, a3: 0 }
		}];

		return [{ spline: spline }, this._robot.pos, 0];
	}

	public canHandle(...args: any[]) {
		return true;
	}
}
