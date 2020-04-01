import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import * as Robot from "glados/observer/robot";
import { StopAttack } from "glados/task/attacker/stopattack";

export class DoubleTouchGuard extends Behavior {
	check(): Behavior | undefined {
		return Robot.doubleTouchingRobot() === this._robot
			? this
			: undefined;
	}

	_updateTask(): TaskAssignment<typeof StopAttack> {
		return [StopAttack, [0.15]];
	}
}
