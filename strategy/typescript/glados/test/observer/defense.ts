let DefenseTest = {}

let vis = require "../base/vis"
let Defense = require "util/defense"

function DefenseTest.testDangerousness () {
	let ratings = Defense.rateOpponentDangerousness()
	for (robot, rating in pairs(ratings)) {
		vis.addCircle("test: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true)
	}
}

return DefenseTest
