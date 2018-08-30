import * as debug from "base/debug";
import {Robot} from "base/robot";
import {Behavior, TaskAssignment} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import {InterceptPass} from "glados/task/defender/interceptpass"
import {Piggy as PiggyTask} from "glados/task/defender/piggy"

export class Piggy extends Behavior {
	_opp: Robot | undefined = undefined;

	_stop () {
		this._opp = undefined;
	}

	check (): boolean {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "Piggy";
	}

	_updateTask (): TaskAssignment<typeof InterceptPass> | TaskAssignment<typeof PiggyTask> {
		let assignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
		if (assignment == undefined || assignment.name !== "Piggy") {
			throw new Error();
		}
		let newOpp = assignment.params[0];
		let restartTask = newOpp != this._opp;
		this._opp = newOpp;

		debug.set("target", this._opp.id);

		if (Ball.receivesPass(this._opp)) {
			return [InterceptPass];
		} else {
			return [PiggyTask, [ this._opp ], restartTask];
		}

	}
}