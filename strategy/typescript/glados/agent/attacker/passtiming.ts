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
import { MessageType } from "glados/control/messaging";
import { SideStep } from "glados/task/attacker/sidestep";
import * as Attack from "glados/util/attack";


export class PassTiming extends Behavior {
	private _remainingTime: number | undefined;
	public check(): Behavior | undefined {
		let lastIncomingPassInfo = Attack.lastIncomingPassInfo(this._robot, this._messaging.receiveSingleSender(MessageType.passInfo));

		if (this._messaging.receiveTrainer(MessageType.mainAttacker) !== this._robot) {
			return undefined;
		}

		let lastIncomingPassInfoPos = undefined;

		if (lastIncomingPassInfo) {
			lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos;
		}

		if (lastIncomingPassInfoPos != undefined) {
			let [startAccept, timeToStart] = Attack.checkPassInfos(this._robot, [lastIncomingPassInfo!], true);
			if (!startAccept) {
				this._remainingTime = timeToStart;
				return this;
			}
		}

		return undefined;
	}

	protected _updateTask(): TaskAssignment<typeof SideStep> {
		if (this._task instanceof SideStep) {
			(this._task as SideStep).updateTime(this._remainingTime);
		}
		return [SideStep, [Attack.lastIncomingPassInfo(this._robot, this._messaging.receiveSingleSender(MessageType.passInfo))!, this._remainingTime]];
	}
}
