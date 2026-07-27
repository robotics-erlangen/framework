/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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

import { Behavior } from "glados/agent/base/behavior";
import { WallkickAbility } from "glados/task/ability/wallkickability";
import { Task } from "glados/task/base";

export class Wallkick extends Task {
	private _placementPos: Position;
	private _wallkick: WallkickAbility;

	public constructor(behavior: Behavior, placementPos: Position) {
		super(behavior);
		this._placementPos = placementPos;

		this._wallkick = new WallkickAbility(this._robot, this._placementPos);
	}

	public run() {
		this._wallkick.wallkick(false);
	}
}
