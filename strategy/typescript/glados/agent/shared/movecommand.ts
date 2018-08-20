import {Behavior} from "glados/agent/base/behavior";

import * as World from "base/world";
import {Position} from "base/vector";
import {MoveToPos} from "glados/task/shared/movetopos";
import {Task} from "glados/task/base";

export class MoveCommand extends Behavior {
	check () {
		return this._robot.moveCommand != undefined && !World.IsSimulated;
	}

	_updateTask (): [Task, any[], boolean] {
		return [MoveToPos, [(this._robot.moveCommand as {pos: Position}).pos, undefined, undefined, undefined, true], true];
	}
}