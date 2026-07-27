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

import { TrajectoryCommand } from "base/robot";
import { NoTrajectoryResult, TrajectoryHandler } from "base/trajectory";

// only works for hidden robots
export class Hidden extends TrajectoryHandler<[number, number, number], NoTrajectoryResult> {
	public update(speedForward: number, speedSide: number, omega: number): [TrajectoryCommand, NoTrajectoryResult] {
		if (this._robot.isVisible) {
			throw new Error("can only control invisible robots");
		}
		if (speedForward == undefined || speedSide == undefined || omega == undefined) {
			throw new Error("missing parameters!");
		}

		const trajectoryCommand = { v_f: speedForward, v_s: speedSide, omega: omega };
		return [trajectoryCommand, new NoTrajectoryResult(this._robot)];
	}
}
