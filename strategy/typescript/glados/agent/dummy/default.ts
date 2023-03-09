import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { BallEvadingMoveToPos } from "glados/task/defender/ballevadingmovetopos";


export class Default extends Behavior {

	private lastPos: Vector | undefined = undefined;

	check(): Behavior {
		return this;
	}

	stop() {
		this.lastPos = undefined;
	}

	_updateTask(): TaskAssignment<typeof BallEvadingMoveToPos> {

		this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "dummy" });
		let zone = this._messaging.receiveTrainer(MessageType.dummyZone);

		let pos;
		if (!zone) {
			pos = this._robot.pos;
		} else {
			if (World.RefereeState.includes("Penalty") || World.RefereeState.includes("Kickoff")) {
				// We are not allowed in the opponent half during these gamestates
				let fieldHalfFactor = World.RefereeState.includes("PenaltyDefensive") ? 1 : -1;
				pos = new Vector(zone.defaultPos.x, fieldHalfFactor * zone.defaultPos.y);
			} else {
				pos = zone.defaultPos;
			}
		}

		let restart = this.lastPos !== undefined && this.lastPos !== pos;
		this.lastPos = pos;
		return [BallEvadingMoveToPos, [pos, undefined], restart];
	}
}
