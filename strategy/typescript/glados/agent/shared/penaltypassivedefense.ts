import { teamSize } from "base/constants";
import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;

export class PenaltyPassiveDefense extends Behavior {
	protected startX: number = G.FieldWidth * -2.0;
	protected startY: number = G.FieldHeight * -2.0;
	protected endX: number = G.FieldWidth * 2.0;
	protected endYOffset: number = 1.3;

	// min 1.0m behind ball, 1.5 just in case
	protected yOffset: number = 1.5;

	check(): boolean {
		return Referee.isOpponentPenaltyState();
	}

	_updateTask(): TaskAssignment<typeof MoveToPos> {
		let x = (this._robot.id - World.FriendlyRobots[0].id + 0.5) * G.FieldWidth / teamSize - G.FieldWidthHalf;

		let y = World.Ball.pos.y + this.yOffset;
		let pos = new Vector(x, y);

		const PENALTYOBSTACLE = [
			{
				type: "rect" as "rect",
				start_x: this.startX,
				start_y: this.startY,
				end_x: this.endX,
				end_y: World.Ball.pos.y + this.endYOffset,
				name: "a/a/penaltyPassive"
			}
		];

		return [MoveToPos, [{pos: pos, customObstacles: PENALTYOBSTACLE}], true];
	}
}
