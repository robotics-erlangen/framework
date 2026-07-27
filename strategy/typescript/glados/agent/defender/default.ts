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

import { Position, RelativePosition, Vector } from "base/vector";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { CenterBack } from "glados/task/defender/centerback";
import * as Defense from "glados/util/defense";


export class Default extends Behavior {
	private _customBall: { pos: Position; dir: RelativePosition | undefined } = { pos: new Vector(0, 0), dir: new Vector(1, 0) };

	protected _stop() {
		this._customBall = { pos: new Vector(0, 0), dir: new Vector(1, 0) };
	}

	public check(): Behavior | undefined {
		return this;
	}

	protected _updateTask(): TaskAssignment<typeof CenterBack> {
		let target = this._customBall;

		let [fieldPos, fieldDir] = Defense.calculateBallPositionField();
		this._customBall.pos = fieldPos;
		this._customBall.dir = fieldDir;

		return [CenterBack, [target]];
	}
}
