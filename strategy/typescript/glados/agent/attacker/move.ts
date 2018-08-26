import {Behavior} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import {Task} from "glados/task/base";

export class Move extends Behavior {
	check (): boolean {
		return this._messaging.receiveTrainer(MessageType.moveAssignment) != undefined;
	}

	_updateTask (): [typeof Task, any[] | undefined, boolean | undefined] {
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
			this._applyForMainAttacker(undefined, undefined, 2);
		}
		if (assignment.behavior) {
			return this.runDeferredBehavior(assignment.behavior, assignment.restart);
		}

		return [assignment.class, assignment.params, assignment.restart];
	}
}