import * as Constants from "base/constants";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { BallEvadingMoveToPos } from "glados/task/defender/ballevadingmovetopos";
import { addDummyVisualizations } from "glados/util/dummy";
import { getRandomPosition } from "glados/util/zone";

export class Default extends Behavior {

	private lastPos: Vector | undefined = undefined;

	check(): Behavior {
		return this;
	}

	stop() {
		this.lastPos = undefined;
	}

	_updateTask(): TaskAssignment<typeof BallEvadingMoveToPos> {

		addDummyVisualizations(this._robot);

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
			} else if (World.RefereeState === "DirectDefensive" || World.RefereeState === "BallPlacementDefensive") {
				// Dont interfere with a stopattacker
				let stopattackradius = Constants.stopBallDistance + World.Ball.radius + this._robot.radius + 0.2;
				pos = this.lastPos ? this.lastPos : zone.defaultPos;
				if (pos.distanceToSq(World.Ball.pos) < 1.5 * 1.5 * stopattackradius * stopattackradius) {
					pos = World.Ball.pos + (pos - World.Ball.pos).withLength(1.6 * stopattackradius);
				}
			} else if (World.RefereeState === "Stop") {
				// Stop during stop
				pos = this.lastPos ? this.lastPos : zone.defaultPos;
			} else {
				if (this.lastPos) {
					if (this._robot.pos.distanceTo(this.lastPos) < 0.01) {
						pos = getRandomPosition(zone.boundaries, 0.1);
					} else {
						pos = this.lastPos;
					}
				} else {
					pos = zone.defaultPos;
				}
			}
		}

		let restart = this.lastPos === undefined || this.lastPos !== pos;

		// If we just stand still because we didn't get a zone, we don't want to continue this in the next frame
		// Otherwise it could seem like the robot is malfunctioning
		this.lastPos = zone ? pos : undefined;

		return [BallEvadingMoveToPos, [pos, undefined], restart];
	}
}
