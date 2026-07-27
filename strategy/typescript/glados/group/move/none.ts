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
import * as World from "base/world";

import { Armada } from "glados/group/move/armada";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { WindshieldWiper } from "glados/group/move/windshieldwiper";

const G = World.Geometry;

export class None extends Move {
	public static readonly MIN_ROBOTS: number = 5;
	public static readonly MAX_ROBOTS: number = 9;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	public static wantedMaxRobots(): number {
		return World.DIVISION === "B" ? 5 : 9;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		for (let r of this._robots) {
			taskAssignments[r] = Assignment.create({ class: "none" });
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}

	public canContinue(): boolean {
		if (None.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
			&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
			&& World.RefereeState === "Stop";
	}

	public static canStart(): boolean {
		return Armada.canStart() || WindshieldWiper.canStart();
	}
}
