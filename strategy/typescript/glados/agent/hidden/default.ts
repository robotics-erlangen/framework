import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { RescueRobot } from "glados/task/hidden/rescuerobot";


export class Default extends Behavior {
	check(): Behavior {
		return this;
	}

	_updateTask(): TaskAssignment<typeof RescueRobot> {
		return [RescueRobot];
	}
}
