import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { Halt as HaltTask } from "glados/task/shared/halt";

export class Halt extends Behavior {
	check(): boolean {
		return World.RefereeState === "Halt";
	}

	_updateTask(): TaskAssignment<typeof HaltTask> {
		return [HaltTask];
	}
}
