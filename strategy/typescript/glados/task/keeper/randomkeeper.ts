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

import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const DEST_SWITCH_DISTANCE = 0.02;
const GOAL_DISTANCE = 0.06;

export class RandomKeeper extends Task {
	private _nextX: number | undefined;

	public run() {
		if (this._nextX == undefined || Math.abs(this._robot.pos.x - this._nextX) < DEST_SWITCH_DISTANCE) {
			let bound = World.Geometry.GoalWidth / 2 - this._robot.radius;
			this._nextX = MathUtil.random() * bound * 2 - bound;
		}

		let moveDest = new Vector(this._nextX,
				-World.Geometry.FieldHeightHalf + this._robot.radius + GOAL_DISTANCE);

		// ignore goal walls if ball is shot
		let obstacleTable: PathHelper.PathHelperParameters = {
			ignoreBall: true,
			ignoreGoals: false,
			ignoreDefenseArea: true,
			stopBallDistance: 0.05,
			task: this,
		};
		if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
			obstacleTable.ignoreFriendlyRobots = true;
			obstacleTable.ignoreOpponentRobots = true;
		}
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.trajectory.update(ToTarget, moveDest, Math.PI / 2);
	}
}
