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

import * as debug from "base/debug";
import { AccumVectorRingBuffer } from "base/ringbuffer";
import { Robot } from "base/robot";
import * as World from "base/world";

const STD_THRESHOLD = 0.008;
const STD_HYSTERESIS = 0.0005;
const NUMBER_OF_MEASUREMENTS = 10;
const lastStationary = new Map<Robot, boolean>();
const lastRobotPositions = new Map<Robot, AccumVectorRingBuffer>();

function updateStationary() {
	debug.pushtop("crash.stationary");
	for (let robot of World.OpponentRobots) {
		debug.push(`Robot ${robot.id}`);
		debug.set(undefined, robot);

		// Record measurement first
		if (!lastRobotPositions.has(robot)) {
			lastRobotPositions[robot] = new AccumVectorRingBuffer(NUMBER_OF_MEASUREMENTS);
		}
		const lastPositions = lastRobotPositions[robot]!;
		lastPositions.putOrReplace(robot.pos);

		// Then check for standard deviation of the last few positions
		const stdev = lastPositions.stdev() ?? 0;
		const effective_std_threshold = lastStationary[robot] ? STD_THRESHOLD + STD_HYSTERESIS : STD_THRESHOLD - STD_HYSTERESIS;
		lastStationary[robot] = (stdev < effective_std_threshold);

		debug.set("std", stdev);
		debug.set("stationary", lastStationary[robot]);
		debug.pop();
	}
	debug.pop();
}

export function getStationary(robot: Robot) {
	return lastStationary[robot];
}

let lastIsCrashed = false;
function updateIsCrashed() {
	for (let robot of World.OpponentRobots) {
		if (!lastStationary.has(robot) || !lastStationary.get(robot)) {
			lastIsCrashed = false;
			return;
		}
	}
	lastIsCrashed = true;
}

export function isCrashed() {
	return lastIsCrashed;
}

export function _update() {
	updateStationary();
	updateIsCrashed();
	debug.pushtop("crash.stationary");
	debug.set("crashed", lastIsCrashed);
	debug.pop();
}
