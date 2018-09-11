import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Armada } from "glados/group/move/armada";
import { Assignment, Move } from "glados/group/move/base";
import { WindshieldWiper } from "glados/group/move/windshieldwiper";

let G = World.Geometry;

export class None extends Move {
	static MIN_ROBOTS: number = 5;
	static MAX_ROBOTS: number = 5;

	_updateTasks(): [Map<FriendlyRobot, Assignment>, FriendlyRobot] {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		for (let r of this._robots) {
			taskAssignments[r] = {class: "none", params: []};
		}
		return [taskAssignments, this._robots[0]];
	}

	_canContinue(): boolean {
		if (None.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
			&&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
			&&  World.RefereeState === "Stop";
	}

	static canStart(): boolean {
		return Armada.canStart() || WindshieldWiper.canStart();
	}
}
