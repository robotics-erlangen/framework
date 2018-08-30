import * as World from "base/world";

import {Behavior, TaskAssignment} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import {MoveToStaticBall} from "glados/task/attacker/movetostaticball";
import {ShootPenalty} from "glados/task/attacker/shootpenalty";

const G = World.Geometry;

export class Penalty extends Behavior {
	public check (): boolean {
		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
		let isPenalty = World.RefereeState === "PenaltyOffensivePrepare" || World.RefereeState === "PenaltyOffensive";
		return isPenalty && mainAttacker;
	}

	_updateTask (): TaskAssignment<typeof ShootPenalty> | TaskAssignment<typeof MoveToStaticBall> {
		if (World.RefereeState == "PenaltyOffensivePrepare") {
			return [MoveToStaticBall, [(G.OpponentGoal - World.Ball.pos).angle(), 0.08]];
		} else {// PenaltyOffensive
			return [ShootPenalty];
		}
	}
}