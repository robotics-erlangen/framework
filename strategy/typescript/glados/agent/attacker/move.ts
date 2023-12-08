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
			this.forceDeferredKeepingInPool();
			return deferredResult;
		}

		return [assignment.class, assignment.params, assignment.restart];
	}
}
