import {Behavior} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import {Task} from "glados/task/base";
import {Sidestep} from "glados/task/attacker/sidestep";
import * as Attack from "glados/util/attack";


export class PassTiming extends Behavior {
	check (): boolean {
		let lastIncomingPassInfo = Attack.lastIncomingPassInfo(this._robot, this._messaging.receiveSingleSender(MessageType.passInfo));

		if (this._messaging.receiveTrainer(MessageType.mainAttacker) != this._robot) {
			return false;
		}

		let lastIncomingPassInfoPos = undefined;

		if (lastIncomingPassInfo) {
			lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos;
		}

		if (lastIncomingPassInfoPos && Attack.checkPassInfos(this._robot, [lastIncomingPassInfo], true)[0] == undefined) {
			return true;
		}

		return false;
	}

	_updateTask (): [typeof Task, any[]] {
		return [Sidestep, [Attack.lastIncomingPassInfo(this._robot, this._messaging.receiveSingleSender(MessageType.passInfo))]];
	}
}