import { Position } from "base/vector";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { BallEvadingMoveToPos } from "glados/task/defender/ballevadingmovetopos";

export class ZoneDefense extends Behavior {
	private _movePos: Position | undefined = undefined;

	protected _stop() {
		this._movePos = undefined;
	}

	public check(): Behavior | undefined {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "ZoneDefense"
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof BallEvadingMoveToPos> {
		let assignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
		if (assignment == undefined || assignment.name !== "ZoneDefense") {
			throw new Error();
		}
		let movePos = assignment.params[0];
		let restartTask = movePos !== this._movePos;
		this._movePos = movePos;

		return [BallEvadingMoveToPos, [this._movePos, undefined], restartTask];
	}
}
