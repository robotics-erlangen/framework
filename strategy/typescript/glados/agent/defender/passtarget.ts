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

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";

export class PassTarget extends Behavior {

	public check(): undefined {
		let cbGroup = this._messaging.receiveTrainer(MessageType.centerBackPosTarget);
		if (cbGroup !== undefined && cbGroup.target) {
			// TODO: we might need to stop a pass
			// For now: do nothing
			debug.set("PassTarget", "Centerback");
			return undefined;
		}
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				if (passInfo && passInfo.target === this._robot) {
					this._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
					debug.set("PassTarget", "Attacker");
					return undefined;
				}
			}
		}
		debug.set("PassTarget", "None");
		return undefined;
	}

	protected _updateTask(): any {
		throw new Error("This behavior is not supposed to run");
	}
}
