
import * as debug from "base/debug";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";

export class PassTarget extends Behavior {

	check(): boolean {
		let cbGroup = this._messaging.receiveTrainer(MessageType.centerBackPosTarget);
		if (cbGroup !== undefined && cbGroup.target) {
			// TODO: we might need to stop a pass
			// For now: do nothing
			debug.set("PassTarget", "Centerback");
			return false;
		}
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				if (passInfo && passInfo.target === this._robot) {
					this._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
					debug.set("PassTarget", "Attacker");
					return false;
				}
			}
		}
		debug.set("PassTarget", "None");
		return false;
	}

	_updateTask(): any {
		throw new Error("This behavior is not supposed to run");
	}
}
