import * as Referee from "base/referee";
import * as World from "base/world";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { PlaceBall } from "glados/task/attacker/placeball";
import { StopAttack } from "glados/task/attacker/stopattack";


export class Stop extends Behavior {
	check(): boolean {
		return Referee.isStopState() && this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
	}

	_updateTask(): TaskAssignment<typeof PlaceBall> | TaskAssignment<typeof StopAttack> {
		if (World.RefereeState === "BallPlacementOffensive") {
			return [PlaceBall];
		} else {
			return [StopAttack];
		}
	}
}
