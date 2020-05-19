import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
let G = World.Geometry;

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import { Victory as VictoryTask } from "glados/task/test/victory";

export class Victory extends Move {

	public static readonly MIN_ROBOTS = 3;
	public static readonly MAX_ROBOTS = 12;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	_state: string;


	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._state = "init";
	}

	static canStart() {
		return true;
	}

	_canContinue() {
		return true;
	}

	_updateTasks(): MoveParameters {
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();

		let nRobots = this._robots.length;
		let radius = (G.FieldHeightHalf - G.DefenseHeight) / 2;
		let center: Position = new Vector(0, -radius - 0.75);
		radius = radius - 0.5;
		vis.addCircle("test", center, 0.05, vis.colors.yellow, true);
		let angleStep = 2 * Math.PI / nRobots;

		if (this._state === "init") {
			for (let i = 0; i < this._robots.length; i++) {
				let angle = i * angleStep;
				let moveLine = Vector.fromPolar(angle, radius / 2);
				let pos = center - new Vector(0, -radius / 2) + moveLine;
				taskAssignments[this._robots[i]] = { class: MoveToPos, params: [pos]};
				if (this._robots[i].pos.distanceTo(pos) > 0.1) {
					this._state = "circle";
				}
			}
		} else if (this._state === "circle") {
			for (let i = 0; i < this._robots.length; i++) {
				let angle = (i - 1) * angleStep;
				taskAssignments[this._robots[i]] = { class: VictoryTask, params: [center, 0, angle, radius]};
			}
		}
		let mainAttacker: FriendlyRobot | undefined = undefined;
		return {
			assignments: taskAssignments,
			mainAttacker: mainAttacker
		};
	}
}
