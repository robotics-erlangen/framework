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

import * as debug from "base/debug";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Goal from "glados/observer/goal";

export function testFreeSectors() {
	const freeSectors = Goal.freeSectors(World.Ball.pos, World.OpponentRobots, true);
	vis.setColor(vis.colors.orangeHalf, true);

	for (const s of freeSectors) {
		// log (`${s[1]} ${s[2]}`);
		const pointRight = World.Ball.pos + Vector.fromPolar(s[0], 10);
		const pointLeft = World.Ball.pos + Vector.fromPolar(s[1], 10);
		vis.addPolygon("test: Free Sectors", [World.Ball.pos, pointRight, pointLeft]);
	}
}

export function testCustomFreeSectors() {
	const freeSectors = Goal.allFreeSectors(World.Ball.pos, World.OpponentRobots);
	for (let i = 0; i < freeSectors.length; ++i) {
		const sector = freeSectors[i];
		debug.set(`sector[${i}]`, `[${sector[0]}, ${sector[1]}]`);
	}
	vis.setColor(vis.colors.orangeHalf, true);
	for (const s of freeSectors) {
		vis.addPizza("test: Custom Free Sectors", World.Ball.pos, 5, s[1], s[0]);
	}
}
