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

import * as Constants from "base/constants";
import * as geom from "base/geom";
import { Position } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

export class BallEvadingMoveToPos extends Task {
	private _pos: Position;
	private _dir: number | undefined;
	private _obstacleTable: PathHelper.PathHelperParameters;

	public constructor(behavior: Behavior, pos: Position, dir: number | undefined) {
		super(behavior);
		this._pos = pos;
		this._dir = dir;
		this._obstacleTable = {
			ignoreBall: false,
			task: this,
		};
	}

	public run() {
		let minDist = Constants.stopBallDistance + World.Ball.radius + this._robot.radius;

		let pos = this._pos;
		if (pos.distanceTo(World.Ball.pos) < minDist - 0.01) {
			pos = geom.intersectLineCircle(World.Geometry.FriendlyGoal,
				World.Geometry.FriendlyGoal - this._pos, World.Ball.pos, minDist)[0]!;
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		let dir = this._dir != undefined ? this._dir : (World.Ball.pos - pos).angle();
		this._robot.trajectory.update(ToTarget, pos, dir);
	}
}
