import { Behavior, TaskAssignment } from "glados/agent/base/behavior";

import { Position } from "base/vector";
import * as World from "base/world";
import { MoveToPos } from "glados/task/shared/movetopos";

export class MoveCommand extends Behavior {
	check() {
		return this._robot.moveCommand != undefined && !World.IsSimulated;
	}

	_updateTask(): TaskAssignment<typeof MoveToPos> {
		return [MoveToPos, [this._robot.moveCommand!.pos, undefined, undefined, undefined, true], true];
	}
}