import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { SideStep } from "glados/task/attacker/sidestep";
import * as Attack from "glados/util/attack";


export class PassTiming extends Behavior {
	private _remainingTime: number | undefined;
	check(): Behavior | undefined {
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

	_updateTask(): TaskAssignment<typeof SideStep> {
		if (this._task instanceof SideStep) {
			(this._task as SideStep).updateTime(this._remainingTime);
		}
		return [SideStep, [Attack.lastIncomingPassInfo(this._robot, this._messaging.receiveSingleSender(MessageType.passInfo))!, this._remainingTime]];
	}
}
