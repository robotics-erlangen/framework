import {RescueRobot} from "glados/task/hidden/rescuerobot";
import {Behavior} from "glados/agent/base/behavior";
import {Task} from "glados/task/base";


export class Default extends Behavior {
	check (): boolean {
		return true;
	}

	_updateTask (): [typeof Task] {
		return [RescueRobot];
	}
}