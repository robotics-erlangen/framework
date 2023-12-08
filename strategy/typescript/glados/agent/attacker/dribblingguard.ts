import * as Constants from "base/constants";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { dribblingStartFor } from "glados/observer/robot";
import { StopAttack } from "glados/task/attacker/stopattack";

export class DribblingGuard extends Behavior {
	public check(): DribblingGuard | undefined {
		const dribbleStart = dribblingStartFor(this._robot);
		if (!dribbleStart) {
			return undefined;
		}

		const dribbleDist = dribbleStart.distanceTo(World.Ball.pos);
		const distHysteresis = this._active
			? 0.05 : 0;

		/* Subtract 0.05 for safety */
		return dribbleDist + distHysteresis > Constants.maxDribbleDistance - 0.05
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof StopAttack> {
		/* No need to drive the whole stop distance away */
		return [StopAttack, [2 * this._robot.shootRadius]];
	}
}
