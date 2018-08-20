import { Behavior } from "glados/agent/base/behavior";

import { Position } from "base/vector";
import * as World from "base/world";
import { Task } from "glados/task/base";
import { MoveToPos } from "glados/task/shared/movetopos";

export class MoveCommand extends Behavior {
	check() {
		return this._robot.moveCommand != undefined && !World.IsSimulated;
	}

	_updateTask(): [Task, any[], boolean] {
		return [MoveToPos, [(this._robot.moveCommand as {pos: Position}).pos, undefined, undefined, undefined, true], true];
	}
}
