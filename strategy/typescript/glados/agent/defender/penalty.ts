import * as World from "base/world";
import {Behavior} from "glados/agent/base/behavior";
import {Task} from "glados/task/base";
import {DefendPenalty} from "glados/task/defender/defendpenalty";

export class Penalty extends Behavior {
	check (): boolean {
		return World.RefereeState === "PenaltyDefensivePrepare" || World.RefereeState === "PenaltyDefensive";
	}

	_updateTask (): [typeof Task] {
		return [DefendPenalty];
	}
}