import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;

export class PenaltyShootoutDefensive extends Behavior {

	check(): boolean {
		return Referee.isOpponentPenaltyState();
	}

	_updateTask(): TaskAssignment<typeof MoveToPos> {
		return [MoveToPos, [new Vector(G.FieldWidthHalf - 0.75, G.FieldHeightHalf - 0.75)]];
	}
}
