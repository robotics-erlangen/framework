import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Armada } from "glados/group/move/armada";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { WindshieldWiper } from "glados/group/move/windshieldwiper";

const G = World.Geometry;

export class None extends Move {
	public static readonly MIN_ROBOTS: number = 5;
	public static readonly MAX_ROBOTS: number = 9;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	public static wantedMaxRobots(): number {
		return World.DIVISION === "B" ? 5 : 9;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		for (let r of this._robots) {
			taskAssignments[r] = Assignment.create({ class: "none" });
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}

	public canContinue(): boolean {
		if (None.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
			&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
			&& World.RefereeState === "Stop";
	}

	public static canStart(): boolean {
		return Armada.canStart() || WindshieldWiper.canStart();
	}
}
