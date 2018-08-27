import * as World from "base/world";
import * as Referee from "base/referee";
import {Behavior} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import {Task} from "glados/task/base";
import {StopAttack} from "glados/task/attacker/stopattack"
import {PlaceBall} from "glados/task/attacker/placeball"


export class Stop extends Behavior {
	check (): boolean {
		return Referee.isStopState() && this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
	}

	_updateTask (): [typeof Task] {
		if (World.RefereeState === "BallPlacementOffensive") {
			return [PlaceBall]
		} else {
			return [StopAttack];
		}
	}
}