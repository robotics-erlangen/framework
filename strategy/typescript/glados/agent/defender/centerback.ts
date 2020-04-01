import { Position, RelativePosition, Vector } from "base/vector";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { CenterBack as CenterBackTask } from "glados/task/defender/centerback";

export class CenterBack extends Behavior {
	_lastTarget: {pos: Position, dir: RelativePosition} | undefined = undefined;

	_stop() {
		this._lastTarget = undefined;
	}

	check(): Behavior | undefined {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "CenterBack"
			? this
			: undefined;
	}

	_updateTask(): TaskAssignment<typeof CenterBackTask> {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		let target = <{pos: Vector, dir: Vector, time: number}> role!.params;
		let restart = target !== this._lastTarget;
		this._lastTarget = target;

		return [CenterBackTask, [ target ], restart];
	}
}
