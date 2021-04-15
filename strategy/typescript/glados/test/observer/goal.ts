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
