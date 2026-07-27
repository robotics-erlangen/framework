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

import * as Constants from "base/constants";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { dribblingStartFor } from "glados/observer/robot";
import { StopAttack } from "glados/task/attacker/stopattack";

export class DribblingGuard extends Behavior {
	public check(): DribblingGuard | undefined {
		const dribbleStart = dribblingStartFor(this._robot);
		if (!dribbleStart) {
			return undefined;
		}

		const dribbleDist = dribbleStart.distanceTo(World.Ball.pos);
		const distHysteresis = this._active
			? 0.05 : 0;

		/* Subtract 0.05 for safety */
		return dribbleDist + distHysteresis > Constants.maxDribbleDistance - 0.05
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof StopAttack> {
		/* No need to drive the whole stop distance away */
		return [StopAttack, [2 * this._robot.shootRadius]];
	}
}
