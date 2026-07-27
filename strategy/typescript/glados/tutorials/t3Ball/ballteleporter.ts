/**
 * This file just creates the entrypoint to run the tutorial.
 * You shouldn't modify the code in this file.
 */

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

import * as DebugCommands from "base/debugcommands";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import { Tutorial3 } from "glados/tutorials/t3Ball/tutorial3";


export class BallTeleporter extends Move {
	public static readonly MIN_ROBOTS: number = 1;
	public static readonly MAX_ROBOTS: number = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

	private _initBall: any;
	private _shot: boolean = false;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._initBall = {
			pos: new Vector(0, 4.8),
			posZ: 0,
			speed: new Vector(0, 0),
			speedZ: 0
		};
	}

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		let robotPos = new Vector(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseHeight + 0.3);
		let ballPos = new Vector(0, World.Geometry.FieldHeightHalf - World.Geometry.DefenseHeight);

		if (robotPos.distanceToSq(this._robots[0].pos) > (0.1 * 0.1) && !this._shot) {

			taskAssignments[this._robots[0]] = Assignment.create({ class: MoveToPos, params: [{ pos: robotPos }] });

		} else if (!this._shot) {

			let leftVector = new Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf) - ballPos;
			let angleLV = leftVector.angle();
			let rightVector = new Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf) - ballPos;
			let angleRV = rightVector.angle();
			let diff = angleRV - angleLV;
			let ang = angleLV + (diff * MathUtil.random());
			let dir = Vector.fromPolar(ang, 4.5);

			this._initBall = {
				pos: ballPos,
				posZ: 0,
				speed: dir,
				speedZ: 0
			};

			DebugCommands.moveObjects(this._initBall);

			taskAssignments[this._robots[0]] = Assignment.create({ class: MoveToPos, params: [{ pos: robotPos }] });

			this._shot = true;

		} else {

			taskAssignments[this._robots[0]] = Assignment.create({ class: Tutorial3 });

		}

		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}

}
