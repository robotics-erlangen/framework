import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

const Y_END = -(-World.Geometry.FieldHeightHalf + World.Geometry.DefenseHeight + 0.5);
const Y_START = -World.Geometry.FieldHeightHalf + World.Geometry.DefenseHeight + 0.5;
const TOLERANCE = 0.02;

export class Race extends Move {

	public static readonly MIN_ROBOTS = 1;
	public static readonly MAX_ROBOTS = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	_atStart: boolean = false;

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
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();

		let restart = false;
		if (this._atStart) {
			let finished = true;
			for (let r of this._robots) {
				if (r.pos.y + TOLERANCE < Y_END) {
					finished = false;
					break;
				}
			}
			if (finished) {
				this._atStart = false;
				restart = true;
			}
		} else {
			let finished = true;
			for (let r of this._robots) {
				if (r.pos.y - TOLERANCE > Y_START) {
					finished = false;
					break;
				}
			}
			if (finished) {
				this._atStart = true;
				restart = true;
			}
		}

		for (let i = 0; i < this._robots.length; i++) {
			taskAssignments[this._robots[i]] = Assignment.create({
				class: MoveToPos,
				params: [{ pos: new Vector(-0.5 * (this._robots.length + 1) + i + 2, this._atStart ? Y_END : Y_START) }],
				restart: restart
			});
		}
		return {
			assignments: taskAssignments
		};
	}
}
