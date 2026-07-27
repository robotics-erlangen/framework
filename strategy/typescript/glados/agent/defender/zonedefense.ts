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

import { Position } from "base/vector";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { BallEvadingMoveToPos } from "glados/task/defender/ballevadingmovetopos";

export class ZoneDefense extends Behavior {
	private _movePos: Position | undefined = undefined;

	protected _stop() {
		this._movePos = undefined;
	}

	public check(): Behavior | undefined {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "ZoneDefense"
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof BallEvadingMoveToPos> {
		let assignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
		if (assignment == undefined || assignment.name !== "ZoneDefense") {
			throw new Error();
		}
		let movePos = assignment.params[0];
		let restartTask = movePos !== this._movePos;
		this._movePos = movePos;

		return [BallEvadingMoveToPos, [this._movePos, undefined], restartTask];
	}
}
