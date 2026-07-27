/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { Coordinates } from "base/coordinates";
import * as debug from "base/debug";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { TrajectoryCommand } from "base/robot";
import { RobotLike, TrajectoryHandler, TrajectoryResult } from "base/trajectory";
import { Speed, Vector } from "base/vector";
import * as vis from "base/vis";

export class DirectTrajectoryResult extends TrajectoryResult {
	public readonly dest: undefined = undefined;
	public readonly speed: Speed;

	public constructor(robot: RobotLike, speed: Speed) {
		super(robot);
		this.speed = speed;
	}

	public vis() {
		super.vis();
		vis.addPath("MoveTo", [this._robot.pos, this._robot.pos + this.speed], vis.colors.whiteHalf);
	}

	public debug() {
		super.debug();
		debug.set("speed", this.speed);
	}
}

/**
 * The Direct class extends the TrajectoryHandler to provide direct trajectory updates.
 *
 * This class allows for specifying velocities directly, rather than target positions.
 * It can handle either a target direction or a rotational speed, but not both simultaneously.
 */
export class Direct extends TrajectoryHandler<[Speed, number, number, Vector], DirectTrajectoryResult> {
	/**
	 * Updates the trajectory based on the given parameters.
	 * Only targetDir or rotateSpeed may be passed. accel is optional.
	 *
	 * @param speed - The desired speed of the robot in global coordinates.
	 * @param targetDir - The desired target direction (optional).
	 * @param rotateSpeed - The desired rotational speed (optional).
	 * @param accel - The acceleration vector (optional, default is a zero vector).
	 * @returns The result of the trajectory update including the spline, robot position, and a zero value.
	 * @throws Error if both targetDir and rotateSpeed are passed or if neither are provided.
	 */
	public update(speed: Speed, targetDir?: number, rotateSpeed?: number, accel: Vector = new Vector(0, 0)): [TrajectoryCommand, DirectTrajectoryResult] {
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

		const spline = [{
			t_start: 0,
			t_end: Infinity,
			x: { a0: robotPos.x, a1: speed.x, a2: accel.x / 2, a3: 0 },
			y: { a0: robotPos.y, a1: speed.y, a2: accel.y / 2, a3: 0 },
			phi: { a0: robotDir, a1: rotateSpeed, a2: 0, a3: 0 }
		}];
		return [{ spline }, new DirectTrajectoryResult(this._robot, Coordinates.toLocal(speed))];
	}
}
