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

import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { Halt } from "glados/task/shared/halt";
import { Pass } from "glados/task/shared/pass";

const G = World.Geometry;

// If only one robot is available the robot shoots in the direction between it and the ball.
// If a second robot is available the first one passes to the second one.
export class SimplePass extends Move {
	public static readonly MIN_ROBOTS = 1;
	public static readonly MAX_ROBOTS = 2;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	private _mainAttacker: FriendlyRobot | undefined = undefined;
	private _supporter: FriendlyRobot | undefined = undefined;

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();

		if (this._mainAttacker == undefined) {
			this._mainAttacker = this._robots[0];
			if (this._supporter == undefined && this._robots.length > 1) {
				this._supporter = this._robots[1];
			}
		}

		if (this._robots.length > 1) {
			taskAssignments[this._mainAttacker] = Assignment.create({
				class: Pass,
				params: [{ targetRobot: this._supporter }],
			});
			taskAssignments[this._supporter!] = Assignment.create({
				class: Halt,
				params: [],
			});
		} else {
			taskAssignments[this._mainAttacker] = Assignment.create({
				class: Pass,
				params: [{ targetPos: World.Ball.pos + (World.Ball.pos - this._mainAttacker.pos).normalized() * 4, chip: true }],
			});
		}

		return { assignments: taskAssignments };
	}
}
