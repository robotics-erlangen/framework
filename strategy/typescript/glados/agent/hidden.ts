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

import { Agent } from "glados/agent/base/agent";
import { BehaviorConstructor } from "glados/agent/base/behavior";
import { Default } from "glados/agent/hidden/default";

export class Hidden extends Agent {

	public getBehaviors(): BehaviorConstructor[] {
		return [Default];
	}

	public static takeRobot(robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			if (!robot.isVisible) {
				return robot;
			}
		}
		return undefined;
	}

	public keepRobot(): boolean {
		return !this._robot.isVisible && this._robot.userControl == undefined;
	}

	public rateRobot(): number {
		return 0;
	}
}
