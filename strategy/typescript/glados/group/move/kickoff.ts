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

import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Vector } from "base/vector";
import * as World from "base/world";

import { FreeKick } from "glados/agent/attacker/freekick";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { StopAttack } from "glados/task/attacker/stopattack";
import { Support } from "glados/task/attacker/support";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper";

const G = World.Geometry;

const KICKOFF_FREEKICK = parameterizeClass(FreeKick, Attack.defaultRatePass);

export class KickOff extends Move {
	public static readonly MIN_ROBOTS: number = 2;
	public static readonly MAX_ROBOTS: number = 5;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	public static canStart() {
		return World.RefereeState === "KickoffOffensivePrepare"
			|| World.RefereeState === "KickoffOffensive";
	}


	public static wantedMaxRobots(availableRobots: number): number {
		if (World.DIVISION === "B") {
			return 3;
		}

		let wantedRobots = KickOff.MIN_ROBOTS;
		if (availableRobots === 5) {
			wantedRobots += 1;
		} else if (availableRobots >= 6 && availableRobots < 8) {
			wantedRobots += 2;
		} else if (availableRobots >= 8) {
			wantedRobots = KickOff.MAX_ROBOTS;
		}
		return wantedRobots;
	}

	private _assistantAndPassPos = [
		{ assistantPos: new Vector(-G.FieldWidthHalf * 0.7, -0.7), passDest: new Vector(-G.FieldWidthHalf * 0.9, -0.2) },
		{ assistantPos: new Vector(G.FieldWidthHalf * 0.7, -0.7), passDest: new Vector(G.FieldWidthHalf * 0.9, -0.2) },
		{ assistantPos: new Vector(-G.FieldWidthHalf * 0.3, -G.FieldHeightHalf * 0.2), passDest: new Vector(-G.FieldWidthHalf * 0.4, -G.FieldHeightHalf * 0.1) },
		{ assistantPos: new Vector(G.FieldWidthHalf * 0.3, -G.FieldHeightHalf * 0.2), passDest: new Vector(G.FieldWidthHalf * 0.4, -G.FieldHeightHalf * 0.1) },
	];

	private _assignments: number[];

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._assistantAndPassPos = this._assistantAndPassPos.slice(0, this._robots.length - 1);
		this._assignments = MovesHelper.assignRobots(this._robots, [new Vector(0, 0), ...this._assistantAndPassPos.map((p) => p.assistantPos)]);
	}


	public canContinue(): boolean {
		return World.RefereeState === "KickoffOffensivePrepare"
				|| World.RefereeState === "KickoffOffensive";
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.RefereeState === "KickoffOffensivePrepare") {
			taskAssignments[this._robots[this._assignments[0]]] = Assignment.create({ class: StopAttack, params: [] });
			for (let i = 0; i < this._robots.length - 1; i++) {
				taskAssignments[this._robots[this._assignments[i + 1]]] = Assignment.create({ class: MoveToPos, params: [{ pos: this._assistantAndPassPos[i].assistantPos }] });
			}
		} else {
			let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
			taskAssignments[this._robots[this._assignments[0]]] = Assignment.createBehaviorAssignment({ behavior: KICKOFF_FREEKICK });
			for (let i = 0; i < this._robots.length - 1; i++) {
				if (passInfoTable && Attack.checkPassInfos(this._robots[this._assignments[i + 1]], passInfoTable, false)[0]) {
					taskAssignments[this._robots[this._assignments[i + 1]]] = Assignment.create({ class: AcceptPass });
				} else {
					taskAssignments[this._robots[this._assignments[i + 1]]] = Assignment.create({
						class: Support,
						params: [
							{
								isStriker: true,
								samplingCtor: StrikerSampling,
								manualDefaultPos: this._assistantAndPassPos[i].assistantPos,
								manualPassDest: this._assistantAndPassPos[i].passDest,
							}
						]
					});
				}
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[this._assignments[0]]
		};
	}
}
