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

import { BaseTaskAssignment, Behavior, CONTINUE_TASK } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";

export class Move extends Behavior {
	public check(): Behavior | undefined {
		return this._messaging.receiveTrainer(MessageType.moveAssignment) != undefined
			? this
			: undefined;
	}

	protected _updateTask(): BaseTaskAssignment | typeof CONTINUE_TASK {
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				if (passInfo.target === this._robot) {
					this._forceKeepingInPool = true;
					break;
				}
			}
		}

		let assignment = this._messaging.receiveTrainer(MessageType.moveAssignment);
		if (assignment == undefined) {
			throw new Error();
		}

		if (assignment.mainAttacker) {
			this.applyForMainAttacker(undefined, undefined, 2);
		}
		if (assignment.behavior) {
			let deferredResult = this.runDeferredBehavior(assignment.behavior, assignment.restart);
			// override force keeping in pool from the deferred behavior,
			// otherwise the only robot in a move not running force keeping in pool will be the one
			// running a deferred behavior, usually the mainattacker (not good)
			this._forceDeferredKeepingInPool();
			return deferredResult;
		}

		return [assignment.class, assignment.params, assignment.restart];
	}
}
