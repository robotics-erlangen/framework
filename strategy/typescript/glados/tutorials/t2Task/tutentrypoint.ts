import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import { TutorialTask } from "glados/tutorials/t2Task/tutorial2";

// This file just creates the entrypoint to run the tutorial. You shouldn't modify the code in this file.

export class Tutorial2 extends Move {
	public static MIN_ROBOTS: number = 3;
	public static MAX_ROBOTS: number = 3;
	public static ALLOW_EXTRA_ATTACKERS: boolean = false;

	private _init: boolean;
	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._init = true;
	}

	static canStart() {
		return true;
	}

	public _canContinue() {
		return true;
	}

	public _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (this._init) {
			this._init = false;

			for (let i = 0; i < this._robots.length; i++) {
				let r = this._robots[i];
				let angle = (i - 1) * 2 / 3 * Math.PI;
				let pos = Vector.fromAngle(angle);
				taskAssignments.set(this._robots[i], Assignment.create({class: MoveToPos, params: [{ pos }]}));

				if (r.pos.distanceTo(pos) > 0.1) {
					this._init = true;
				}
			}

		} else {

			for (let i = 0; i < this._robots.length; i++) {
				taskAssignments.set(this._robots[i], Assignment.create({class: TutorialTask, params: [i]}));
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: undefined
		};
	}
}
