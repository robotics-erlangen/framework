/**
 * This file just creates the entrypoint to run the tutorial.
 * You shouldn't modify the code in this file.
 */

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

import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import { Tutorial2 } from "glados/tutorials/t2Task/tutorial2";


export class TaskRunner extends Move {
	public static readonly MIN_ROBOTS: number = 3;
	public static readonly MAX_ROBOTS: number = 3;
	public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

	private _init: boolean;
	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._init = true;
	}

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (this._init) {
			this._init = false;

			for (let i = 0; i < this._robots.length; i++) {
				let r = this._robots[i];
				let angle = (i - 1) * 2 / 3 * Math.PI;
				let pos = Vector.fromAngle(angle);
				taskAssignments.set(this._robots[i], Assignment.create({ class: MoveToPos, params: [{ pos }] }));

				if (r.pos.distanceTo(pos) > 0.1) {
					this._init = true;
				}
			}

		} else {

			for (let i = 0; i < this._robots.length; i++) {
				taskAssignments.set(this._robots[i], Assignment.create({ class: Tutorial2, params: [i] }));
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: undefined
		};
	}
}
