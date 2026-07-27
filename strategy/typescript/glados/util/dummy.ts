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

import { FriendlyRobot } from "base/robot";
import * as vis from "base/vis";

export function addDummyVisualizations(robot: FriendlyRobot) {
	if (!robot.canShoot) {
		vis.addPizza("dummy: can't shoot", robot.pos, 1.5 * robot.radius, robot.dir + 3 * Math.PI / 2,
		 robot.dir + Math.PI / 2, vis.colors.cyanHalf, true);
	}

	if (!robot.canDribble) {
		vis.addPizza("dummy: can't dribble", robot.pos, 1.5 * robot.radius, robot.dir + Math.PI / 2,
		robot.dir - Math.PI / 2, vis.colors.blackHalf, true);
	}
}

export function isDummy(robot: FriendlyRobot): boolean {
	return !robot.canDribble || !robot.canShoot;
}
