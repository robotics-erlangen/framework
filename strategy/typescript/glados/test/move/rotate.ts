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

import * as ListUtil from "base/listutil";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { Task } from "glados/task/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const G = World.Geometry;

class RotateTask extends Task {

	private _targetDir: number = 0;
	private _targetReached: number | undefined;

	public constructor(behavior: Behavior) {
		super(behavior);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		if (this._targetReached !== undefined && World.Time - this._targetReached > 3) {
			this._targetReached = undefined;
			this._targetDir = Math.PI - this._targetDir;
		}

		if (this._targetReached === undefined && Math.abs(this._robot.dir - this._targetDir) % (Math.PI * 2) < 0.05 && Math.abs(this._robot.angularSpeed) < 0.1) {
			this._targetReached = World.Time;
		}

		this._robot.trajectory.update(ToTarget, this._robot.pos, this._targetDir, undefined, new Vector(0, 0));
	}

}

export class Rotate extends Move {

	public static readonly MIN_ROBOTS = 1;
	public static readonly MAX_ROBOTS = 16;

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();
		for (let i = 0; i < this._robots.length; i++) {
			let r = this._robots[i];
			taskAssignments[r] = Assignment.create({
				class: RotateTask,
			});
		}

		return { assignments: taskAssignments };
	}
}

