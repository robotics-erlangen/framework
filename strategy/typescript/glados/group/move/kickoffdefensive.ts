/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { FriendlyRobot, Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { StopAttack } from "glados/task/attacker/stopattack";
import { ManMark } from "glados/task/defender/manmark";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as MovesHelper from "glados/util/moveshelper";

const G = World.Geometry;

function getTarget(prevTarget: Robot | undefined, fallbackPos: Position): [Robot, boolean] | [] {
	let maxDist = 2.5;
	let distHysteresis = 1;

	let prevDist = prevTarget ? prevTarget.pos.distanceTo(fallbackPos) : Infinity;
	if (prevDist > maxDist || (prevTarget && Math.abs(prevTarget.pos.x) < G.CenterCircleRadius)) {
		prevDist = Infinity;
	}

	let closestTarget;
	let closestDist = Infinity;
	for (let r of World.OpponentRobots) {
		if (r.pos.x * fallbackPos.x > 0 && Math.abs(r.pos.x) > G.CenterCircleRadius + 0.3) {
			let dist = r.pos.distanceTo(fallbackPos);
			if (dist < closestDist) {
				closestTarget = r;
				closestDist = dist;
			}
		}
	}

	let dist = prevDist;
	let target = prevTarget;
	if (closestDist + distHysteresis < prevDist) {
		dist = closestDist;
		target = closestTarget;
	}

	if (dist < Infinity) {
		return [<Robot> target, target !== prevTarget];
	}

	return [];
}

export class KickOffDefensive extends Move {
	public static readonly MIN_ROBOTS: number = 1;
	public static readonly MAX_ROBOTS: number = 3;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	public static canStart(): boolean {
		return World.RefereeState === "KickoffDefensivePrepare"
				|| World.RefereeState === "KickoffDefensive";
	}

	private _fallbackPos = [
		new Vector(-G.FieldWidthHalf * 0.5, -0.4),
		new Vector(G.FieldWidthHalf * 0.5, -0.4),
	];
	private _assignments: number[];
	private _targetLeft: Robot | undefined;
	private _targetRight: Robot | undefined;


	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);


		let positions = [new Vector(0, 0)];
		for (let i = 0; i < this._robots.length - 1; i++) {
			positions.push(this._fallbackPos[i]);
		}
		this._assignments = MovesHelper.assignRobots(this._robots, positions);
	}

	public canContinue(): boolean {
		return World.RefereeState === "KickoffDefensivePrepare"
				|| World.RefereeState === "KickoffDefensive";
	}

	protected _updateTasks(): MoveParameters {
		let restartLeft: boolean | undefined, restartRight: boolean | undefined;
		[this._targetLeft, restartLeft] = getTarget(this._targetLeft, this._fallbackPos[0]);
		[this._targetRight, restartRight] = getTarget(this._targetRight, this._fallbackPos[1]);

		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		taskAssignments[this._robots[this._assignments[0]]] = Assignment.create({ class: StopAttack, params: [] });

		if (this._robots.length > 1) {
			if (this._targetLeft) {
				taskAssignments[this._robots[this._assignments[1]]] = Assignment.create({ class: ManMark, params: [this._targetLeft], restart: restartLeft });
			} else {
				taskAssignments[this._robots[this._assignments[1]]] = Assignment.create({ class: MoveToPos, params: [{ pos: this._fallbackPos[0] }] });
			}
		}
		if (this._robots.length > 2) {
			if (this._targetRight) {
				taskAssignments[this._robots[this._assignments[2]]] = Assignment.create({ class: ManMark, params: [this._targetRight], restart: restartRight });
			} else {
				taskAssignments[this._robots[this._assignments[2]]] = Assignment.create({ class: MoveToPos, params: [{ pos: this._fallbackPos[1] }] });
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[this._assignments[0]]
		};
	}
}
