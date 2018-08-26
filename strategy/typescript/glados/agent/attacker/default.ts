import {Behavior} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import {Task} from "glados/task/base";
import {AcceptPass} from "glados/task/attacker/acceptpass";
import {Midfield} from "glados/task/attacker/midfield";
import {SideStep} from "glados/task/attacker/sidestep";
import {Striker} from "glados/task/attacker/striker";
import * as Attack from "glados/util/attack";

export class Default extends Behavior {
	_forceKeepingInPool: boolean = false;

	_stop () {
		this._forceKeepingInPool = false;
	}

	check (): boolean {
		this._forceKeepingInPool = false;
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				if (passInfo && passInfo.target == this._robot) {
					this._forceKeepingInPool = true;
				}
			}
		}
		this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "midfield", payload: {} });

		return true;
	}

	_updateTask (): [typeof Task] | [typeof Task, any[]] {
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let relevantPassInfo = Attack.relevantPassInfoMessage(this._robot, passInfoTable);
		let acceptingPass = Attack.checkPassInfos(this._robot, passInfoTable, false)[0];

		let midfieldZone = this._messaging.receiveTrainer(MessageType.midfieldZone);
		let Freebreaker = midfieldZone ? Midfield : Striker;

		if (relevantPassInfo && acceptingPass == undefined) {
			return [SideStep, [relevantPassInfo]];
		}
		return [acceptingPass ? AcceptPass : Freebreaker];
	}
}