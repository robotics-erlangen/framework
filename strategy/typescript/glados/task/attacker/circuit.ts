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

import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class Circuit extends Task {
	private _suggestPass: SuggestPass;
	private _center: Position;
	private _angleOffset: number;
	private _radius: number;
	private _passPos: Position | undefined;
	private _anonym: boolean;
	private _obstacleTable: PathHelper.PathHelperParameters = {
		ignorePass: true
	};

	public constructor(behavior: Behavior, center: Position, angleOffset: number, radius = 0.5, passPos?: Position, anonym = false) {
		super(behavior);
		this._suggestPass = new SuggestPass(this);
		this._center = center;
		this._angleOffset = angleOffset;
		this._radius = radius;
		this._passPos = passPos;
		this._anonym = anonym;
	}

	public run() {
		let angle = (World.Time % 1000) % (Math.PI * 2) + this._angleOffset;
		let pos = this._center + Vector.fromPolar(angle, this._radius);
		let dir = (World.Ball.pos - pos).angle();

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		this._robot.trajectory.update(ToTarget, pos, dir);

		if (this._passPos) {
			this._suggestPass.suggestPassRobotPosition(this._passPos, undefined, undefined, this._anonym);
		}
	}
}
