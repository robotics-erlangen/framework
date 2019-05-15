import { FriendlyRobot } from "base/robot";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { TrajectoryTiming as TrajectoryTimingTask } from "glados/task/test/trajectorytiming";

export class TrajectoryTiming extends Move {
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;
	public static ALLOW_EXTRA_ATTACKERS: boolean = false;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}

	static canStart() {
		return  true;
	}

	_canContinue() {
		return true;
	}

	_updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		taskAssignments[this._robots[0]] = { class: TrajectoryTimingTask };

		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}
