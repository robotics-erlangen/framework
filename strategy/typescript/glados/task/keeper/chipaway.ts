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

import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";

let obstacleTable: PathHelper.PathHelperParameters = {
	ignorePass: true
};

export class ChipAway extends Task {
	private _shoot: Shoot;

	public constructor(behavior: Behavior) {
		super(behavior);
		this._shoot = new Shoot(this);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		// chip to opponent's defense line, so that the ball would roll into the goal's center
		let oppGoal = World.Geometry.OpponentGoal;
		let chipPos = oppGoal + (this._robot.pos - oppGoal).withLength(World.Geometry.DefenseHeight);
		this._shoot.chipToPos(chipPos);
		vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true);
	}
}
