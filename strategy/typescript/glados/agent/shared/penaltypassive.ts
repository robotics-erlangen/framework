import { teamSize } from "base/constants";
import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;

export class PenaltyPassive extends Behavior {
	start_x: number = G.FieldWidth * -2.0;
	start_y: number = G.FieldHeight * -2.0;
	end_x: number = G.FieldWidth * 2.0;
	end_y_offset: number = 1.3;

	// min 1.0m behind ball, 1.5 just in case
	y_offset: number = 1.5;

	check(): boolean {
		return Referee.isOpponentPenaltyState();
	}

	_updateTask(): TaskAssignment<typeof MoveToPos> {
		let x = (this._robot.id - World.FriendlyRobots[0].id + 0.5) * G.FieldWidth / teamSize - G.FieldWidthHalf;

		let y = World.Ball.pos.y + this.y_offset;
		let pos = new Vector(x, y);

		const PENALTYOBSTACLE = [
			{
				type: "rect" as "rect",
				start_x: this.start_x,
				start_y: this.start_y,
				end_x: this.end_x,
				end_y: World.Ball.pos.y + this.end_y_offset,
				name: "a/a/penaltyPassive"
			}
		];

		return [MoveToPos, [{pos: pos, customObstacles: PENALTYOBSTACLE}], true];
	}
}
