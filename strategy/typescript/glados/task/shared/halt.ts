import { Task } from "glados/task/base";

export class Halt extends Task {
	run() {
		this._robot.halt();
	}
}
