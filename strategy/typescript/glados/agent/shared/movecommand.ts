import * as pb from "base/protobuf";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

export class MoveCommand extends Behavior {
	public check(): Behavior | undefined {
		return this._robot.moveCommand != undefined && World.WorldStateSource() !== pb.world.WorldSource.INTERNAL_SIMULATION
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof MoveToPos> {
		return [MoveToPos, [{ pos: this._robot.moveCommand!.pos, ignoreDefaultObstacles: true }], true];
	}
}
