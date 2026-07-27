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

import * as Cache from "base/cache";
import { Robot } from "base/robot";


function _join(listA: readonly Robot[], listB: readonly Robot[]): Robot[] {
	return listA.concat(listB);
}
export let join: (listA: readonly Robot[], listB: readonly Robot[]) => Robot[] = Cache.forFrame(_join);

function _excludeRobot(list: readonly Robot[], robot: Robot): Robot[] {
	let result = list.slice();
	for (let i = 0; i < list.length; i++) {
		let r = list[i];
		if (r === robot) {
			result.splice(i, 1);
			break;
		}
	}
	return result;
}
export let excludeRobot: (list: readonly Robot[], robot: Robot) => Robot[] = Cache.forFrame(_excludeRobot);

function _excludeRobots(list: readonly Robot[], robots: readonly Robot[]): Robot[] {
	let result: Robot[] = [];
	for (let r of list) {
		let found = false;
		for (let robot of robots) {
			if (r === robot) {
				found = true;
			}
		}
		if (!found) {
			result.push(r);
		}
	}
	return result;
}
export let excludeRobots: (list: readonly Robot[], robots: readonly Robot[]) => Robot[] = Cache.forFrame(_excludeRobots);
