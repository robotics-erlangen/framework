import { FriendlyRobot } from "base/robot";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { Task } from "glados/task/base";

export function makeSingleTaskMove(task: any): typeof Move {
	class SingleTaskMove extends Move {
		public static readonly MIN_ROBOTS: number = 1;
		public static readonly MAX_ROBOTS: number = 1;
		public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

		public static readonly NAME: string = task.name;

		constructor(robots: FriendlyRobot[], messaging: MessageBox) {
			super(robots, messaging);
		}

		static canStart() {
			return true;
		}

		_canContinue() {
			return true;
		}

		_updateTasks(): MoveParameters {
			let taskAssignments = new Map<FriendlyRobot, Assignment>();

			taskAssignments[this._robots[0]] = Assignment.create({ class: task });

			return {
				assignments: taskAssignments,
				mainAttacker: this._robots[0]
			};
		}
	}
	return SingleTaskMove;
}
