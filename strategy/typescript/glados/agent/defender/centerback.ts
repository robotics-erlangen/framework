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

import { Position, RelativePosition, Vector } from "base/vector";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { CenterBack as CenterBackTask } from "glados/task/defender/centerback";

export class CenterBack extends Behavior {
	private _lastTarget: { pos: Position; dir: RelativePosition } | undefined = undefined;

	protected _stop() {
		this._lastTarget = undefined;
	}

	public check(): Behavior | undefined {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "CenterBack"
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof CenterBackTask> {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		let target = <{ pos: Vector; dir: Vector; time: number }> role!.params;
		let restart = target !== this._lastTarget;
		this._lastTarget = target;

		return [CenterBackTask, [target], restart];
	}
}
