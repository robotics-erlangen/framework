import {Task} from "glados/task/base";

class Halt extends Task {
	run() {
		this._robot.halt();
	}
}