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

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import * as Robot from "glados/observer/robot";
import { StopAttack } from "glados/task/attacker/stopattack";

export class DoubleTouchGuard extends Behavior {
	public check(): Behavior | undefined {
		return Robot.doubleTouchingRobot() === this._robot
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof StopAttack> {
		return [StopAttack, [0.15]];
	}
}
