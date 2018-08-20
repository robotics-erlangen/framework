import {Behavior} from "glados/agent/base/behavior";
import * as World from "base/world";
import {HaltTask} from "glados/task/shared/halt";

export class Halt extends Behavior {
	check (): boolean {
		return World.RefereeState === "Halt";
	}

	_updateTask () {
		return HaltTask;
	}
}