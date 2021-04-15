import * as vis from "base/vis";

import * as Defense from "glados/util/defense";

export function testDangerousness() {
	const ratings = Defense.rateOpponentDangerousness();
	for (const [robot, rating] of ratings.entries()) {
		vis.addCircle("test: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true);
	}
}

