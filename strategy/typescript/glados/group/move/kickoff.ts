import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { FreeKick } from "glados/agent/attacker/freekick";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { StopAttack } from "glados/task/attacker/stopattack";
import { Striker } from "glados/task/attacker/striker";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper";

let G = World.Geometry;

export class KickOff extends Move {
	public static MIN_ROBOTS: number = 2;
	public static MAX_ROBOTS: number = 3;

	static canStart() {
		return World.RefereeState === "KickoffOffensivePrepare";
	}

	private _assistantPos = [
		new Vector(-G.FieldWidthHalf * 0.7, -0.7),
		new Vector(G.FieldWidthHalf * 0.7, -0.7),
	];
	private _passDest = [
		new Vector(-G.FieldWidthHalf * 0.9, -0.2),
		new Vector(G.FieldWidthHalf * 0.9, -0.2),
	];
	private _assignments: number[];

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		let positions = [ new Vector(0, 0) ];
		for (let i = 0;i < this._robots.length - 1;i++) {
			positions.push(this._assistantPos[i]);
		}
		this._assignments = MovesHelper.assignRobots(this._robots, positions, 0);
	}

	_canContinue(): boolean {
		return World.RefereeState === "KickoffOffensivePrepare"
				||  World.RefereeState === "KickoffOffensive";
	}

	_updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.RefereeState === "KickoffOffensivePrepare") {
			taskAssignments[this._robots[this._assignments[0]]] = { class: StopAttack, params: [] };
			taskAssignments[this._robots[this._assignments[1]]] = { class: MoveToPos, params: [ this._assistantPos[0] ] };
			if (this._robots.length === 3) {
				taskAssignments[this._robots[this._assignments[2]]] = { class: MoveToPos, params: [ this._assistantPos[1] ] };
			}
		} else {
			let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
			taskAssignments[this._robots[this._assignments[0]]] = { behavior: FreeKick };
			for (let i = 0;i < this._robots.length - 1;i++) {
				if (passInfoTable && Attack.checkPassInfos(this._robots[this._assignments[i + 1]], passInfoTable, false)) {
					taskAssignments[this._robots[this._assignments[i + 1]]] = { class: AcceptPass };
				} else {
					taskAssignments[this._robots[this._assignments[i + 1]]] = { class: Striker, params: [ this._assistantPos[i], this._passDest[i] ] };
				}
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[this._assignments[0]]
		};
	}
}
