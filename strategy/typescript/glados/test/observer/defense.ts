let DefenseTest = {}

import * as vis from "base/vis";
import * as Defense from "glados/util/defense";

function DefenseTest.testDangerousness () {
	let ratings = Defense.rateOpponentDangerousness()
	for (robot, rating in pairs(ratings)) {
		vis.addCircle("test: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true)
	}
}

return DefenseTest
