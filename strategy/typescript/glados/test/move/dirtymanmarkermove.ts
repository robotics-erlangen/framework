import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { DirtyManMarker } from "glados/task/defender/dirtymanmarker";

export class DirtyManMarkerMove extends Move {
	public static readonly MIN_ROBOTS: number = 1;
	public static readonly MAX_ROBOTS: number = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		taskAssignments[this._robots[0]] = Assignment.create({ class: DirtyManMarker, params: [World.OpponentRobots[0]] });
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}

