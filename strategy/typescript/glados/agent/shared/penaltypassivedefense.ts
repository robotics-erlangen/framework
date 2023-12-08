import * as Referee from "base/referee";
import { Vector, Position } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;

export class PenaltyPassiveDefense extends Behavior {
	protected startPos: Position = -new Vector(G.FieldWidth, G.FieldHeight) * 2;
	protected endX: number = G.FieldWidth * 2.0;
	protected endYOffset: number = 1.3;

	// min 1.0m behind ball, 1.5 just in case
	protected yOffset: number = 1.5;

	public check(): Behavior | undefined {
		return Referee.isOpponentPenaltyState() ? this : undefined;
	}

	protected _updateTask(): TaskAssignment<typeof MoveToPos> {
		let x = (this._robot.id - World.FriendlyRobots[0].id + 0.5) * G.FieldWidth / World.MaxAllowedFriendlyRobots - G.FieldWidthHalf;

		let y = World.Ball.pos.y + this.yOffset;
		let pos = new Vector(x, y);

		const penaltyObstacle = {
			type: "rect" as "rect",
			start: this.startPos,
			end: new Vector(this.endX, World.Ball.pos.y + this.endYOffset),
			radius: 0,
			name: "a/a/penaltyPassive"
		};

		return [MoveToPos, [{ pos: pos, customObstacles: [penaltyObstacle] }], true];
	}
}
