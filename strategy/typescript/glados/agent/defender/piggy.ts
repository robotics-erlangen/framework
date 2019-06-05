import * as debug from "base/debug";
import { Robot } from "base/robot";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import { BreakPass } from "glados/task/defender/breakpass";
import { Piggy as PiggyTask } from "glados/task/defender/piggy";

export class Piggy extends Behavior {
	_opp: Robot | undefined = undefined;

	_stop() {
		this._opp = undefined;
	}

	check(): boolean {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "Piggy";
	}

	_updateTask(): TaskAssignment<typeof BreakPass> | TaskAssignment<typeof PiggyTask> {
		let assignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
		if (assignment == undefined || assignment.name !== "Piggy") {
			throw new Error();
		}
		let newOpp = assignment.params[0];
		let restartTask = newOpp !== this._opp;
		this._opp = newOpp;

		debug.set("target", this._opp.id);

		let [moveDest, endSpeed, waitingTime] = BreakPass.calculateBreakPos(this._robot);
		let breakPassThreshold = 0;
		if (this._task instanceof BreakPass) {
			breakPassThreshold = 0.1;
		}

		if ((Ball.receivesPass(this._opp)) && (breakPassThreshold >= waitingTime)) {
			return [BreakPass, [ this._opp ], false];
		} else {
			return [PiggyTask, [ this._opp ], restartTask];
		}

	}
}
