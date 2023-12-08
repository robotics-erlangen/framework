import { Task } from "glados/task/base";

export class Halt extends Task {
	public run() {
		this._robot.halt();
	}
}
