import {RescueRobot} from "glados/task/hidden/rescuerobot";
import {Behavior, TaskAssignment} from "glados/agent/base/behavior";


export class Default extends Behavior {
	check (): boolean {
		return true;
	}

	_updateTask (): TaskAssignment<typeof RescueRobot> {
		return [RescueRobot];
	}
}