import * as World from "base/world";
import { Behavior } from "glados/agent/base/behavior";
import { HaltTask } from "glados/task/shared/halt";

export class Halt extends Behavior {
	check(): boolean {
		return World.RefereeState === "Halt";
	}

	_updateTask() {
		return HaltTask;
	}
}
