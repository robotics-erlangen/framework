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

import * as debug from "base/debug";
import { Robot } from "base/robot";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { Piggy as PiggyTask } from "glados/task/defender/piggy";

export class Piggy extends Behavior {
	private _opp: Robot | undefined = undefined;

	protected _stop() {
		this._opp = undefined;
	}

	public check(): Behavior | undefined {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "Piggy"
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof PiggyTask> {
		let assignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
		if (assignment == undefined || assignment.name !== "Piggy") {
			throw new Error();
		}
		let newOpp = assignment.params[0];
		let restartTask = newOpp !== this._opp;
		this._opp = newOpp;

		debug.set("target", this._opp.id);

		return [PiggyTask, [this._opp], restartTask];
	}
}
