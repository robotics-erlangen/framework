/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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
