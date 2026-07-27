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

import * as geom from "base/geom";
import { Speed, Vector } from "base/vector";
import * as World from "base/world";

import { Task } from "glados/task/base";
import { Hidden } from "glados/trajectory/hidden";

export class RescueRobot extends Task {
	private _rotation: number | undefined;
	// list of local speeds: (speedForward, speedSide)
	private _speeds: Speed[] | undefined;

	public run() {
		// ignore visible robots
		if (this._robot.isVisible || this._robot.speed == undefined) {
			return;
		}

		if (this._rotation == undefined || this._speeds == undefined) {
			// align forward direction with the opposite speed the robot had when it was lost
			let robotSpeed = this._robot.speed;
			if (robotSpeed.length() < 0.0001) {
				// ensure that backwardsDir points to the opponent goal, if the robot doesn't move
				robotSpeed = new Vector(0, -1);
			}
			let backwardsDir = (-robotSpeed).angle();
			let frontDir = this._robot.dir;
			this._rotation = geom.getAngleDiff(frontDir, backwardsDir);

			// if field center is on the left while moving forward
			if (geom.checkTriangleOrientation(this._robot.pos, this._robot.pos + Vector.fromAngle(backwardsDir), new Vector(0, 0)) >= 0) {
				this._speeds = [
					new Vector(1, 0), // forward
					new Vector(-1, 0), // backward
					new Vector(0, -1), // left
					new Vector(0, 1) // right
				];
			} else {
				this._speeds = [
					new Vector(1, 0), // forward
					new Vector(-1, 0), // backward
					new Vector(0, 1), // right
					new Vector(0, -1) // left
				];
			}
		}

		// use time as index, one new vector every second
		let timeDiff = World.Time - this._robot.lostSince;
		let idx = Math.floor(timeDiff); // offset for array start index
		let speed = this._speeds[idx];

		if (speed) {
			speed = speed.rotated(this._rotation);
			this._robot.trajectory.update(Hidden, speed.x, speed.y, 0);
		}
	}
}
