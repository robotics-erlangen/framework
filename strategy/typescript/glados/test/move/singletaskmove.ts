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

import { FriendlyRobot } from "base/robot";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { Task } from "glados/task/base";

export function makeSingleTaskMove(task: any): typeof Move {
	class SingleTaskMove extends Move {
		public static readonly MIN_ROBOTS: number = 1;
		public static readonly MAX_ROBOTS: number = 1;
		public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

		public static readonly NAME: string = task.name;

		public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
			super(robots, messaging);
		}

		public static canStart() {
			return true;
		}

		public canContinue(): boolean {
			return true;
		}

		protected _updateTasks(): MoveParameters {
			let taskAssignments = new Map<FriendlyRobot, Assignment>();

			taskAssignments[this._robots[0]] = Assignment.create({ class: task });

			return {
				assignments: taskAssignments,
				mainAttacker: this._robots[0]
			};
		}
	}
	return SingleTaskMove;
}
