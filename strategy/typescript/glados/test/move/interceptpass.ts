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
import { Vector } from "base/vector";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import * as Ball from "glados/observer/ball";
import { MidfieldSampling } from "glados/task/ability/midfieldsampling";
import { Support } from "glados/task/attacker/support";
import { Pass } from "glados/task/shared/pass";


const LEFT_POS = World.Geometry.FieldHeightHalf - 2;
const HEIGHT_POS = World.Geometry.FieldWidthHalf - 0.3;

export class InterceptPassMove extends Move {
	public static readonly MIN_ROBOTS: number = 2;
	public static readonly MAX_ROBOTS: number = 2;

	public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

	private lastMainAttacker: FriendlyRobot | undefined;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this.lastMainAttacker = undefined;
	}

	public static canStart() {
		return true;
	}

	public canContinue() {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		let mainAttacker;
		let default1 = new Vector(HEIGHT_POS, LEFT_POS);
		let default2 = new Vector(-HEIGHT_POS, LEFT_POS);
		if (Ball.receivesPass(this._robots[0])
			|| (!Ball.receivesPass(this._robots[1])
			&& World.Ball.pos.x > 0)) {
			if (this.lastMainAttacker === this._robots[0]) {
				taskAssignments[this._robots[0]] = Assignment.create({class: Pass, params: [{ targetRobot: this._robots[1], ignoreCrash: true }]});
			} else {
				taskAssignments[this._robots[0]] = Assignment.create({class: Support, params: [{ isStriker: false, samplingCtor: MidfieldSampling, manualDefaultPos: default1, manualPassDest: default1}]});
			}
			mainAttacker = this._robots[0];
		} else {
			taskAssignments[this._robots[0]] = Assignment.create({class: Support, params: [{ isStriker: false, samplingCtor: MidfieldSampling, manualDefaultPos: default1, manualPassDest: default1}]});
		}
		if (mainAttacker === undefined) {
			if (this.lastMainAttacker === this._robots[1]) {
				taskAssignments[this._robots[1]] = Assignment.create({class: Pass, params: [{ targetRobot: this._robots[0], ignoreCrash: true }]});
			} else {
				taskAssignments[this._robots[1]] = Assignment.create({class: Support, params: [{ isStriker: false, samplingCtor: MidfieldSampling, manualDefaultPos: default2, manualPassDest: default2}]});
			}
			mainAttacker = this._robots[1];
		} else {
			taskAssignments[this._robots[1]] = Assignment.create({class: Support, params: [{ isStriker: false, samplingCtor: MidfieldSampling, manualDefaultPos: default2, manualPassDest: default2}]});
		}
		this.lastMainAttacker = mainAttacker;
		return { assignments: taskAssignments, mainAttacker: mainAttacker };
	}
}
