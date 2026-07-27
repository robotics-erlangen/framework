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
import { Vector } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


const degree = 1;
const jumps_after = 300;
const jump = -30;
export class RotTest extends Task {
	private _index: number;
	private _nextJump: boolean;
	private _obstacleTable: PathHelper.PathHelperParameters = {
		ignorePass: true
	};
	public constructor(behavior: Behavior) {
		super(behavior);
		this._index = 0;
		this._nextJump = true;
	}
	public run() {
		let angle = geom.degreeToRadian(this._index * degree);
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		this._robot.trajectory.update(ToTarget, new Vector(1, 1), angle);
		this._index += 1;
		let angleDeg = this._index * degree;
		if (angleDeg > 360) {
			this._index -= 360 / degree;
		}
		if (angleDeg > jumps_after && angleDeg - degree <= jumps_after) {
			if (this._nextJump) {
				this._index += (jump / degree);
				if (jump < 0) {
					this._nextJump = false;
				}
			} else {
				this._nextJump = true;
			}
		}
	}
}
