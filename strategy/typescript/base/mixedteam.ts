let mixedteam = {}

let sendMixedTeamInfo = amun.sendMixedTeamInfo


let decodeLocation = function (loc) {
	return new Vector(loc.y / 1000, -loc.x / 1000)
}

let decodeDirection = function (dir) {
	return dir + Math.PI/2
}

// convert ssl::TeamInfo to internal representation
function mixedteam.decodeData (data) {
	let robotInfo = {}

	for (_, robotPlan in ipairs(data)) {
		//debug.set("dt", robotPlan)
		let plan = {}
		if (robotPlan.role) {
			plan.role = robotPlan.role
		} else {
			plan.role = "Default"
		}

		if (robotPlan.nav_target && robotPlan.nav_target.loc) {
			plan.targetPos = decodeLocation(robotPlan.nav_target.loc)
			if (robotPlan.nav_target.heading) {
				plan.targetDir = decodeDirection(robotPlan.nav_target.heading)
			}
		}

		if (robotPlan.shot_target) {
			plan.shootPos = decodeLocation(robotPlan.shot_target)
		}

		robotInfo[robotPlan.robot_id] = plan
	}
	return robotInfo
}

let encodeLocation = function (loc) {
	return { x = -loc.y * 1000, y = loc.x * 1000 }
}

let encodeDirection = function (dir) {
	return dir - Math.PI/2
}

function mixedteam.encodeData (data) {
	let teamPlan = {}
	for (id, plan in pairs(data)) {
		let robotPlan = {}
		robotPlan.robot_id = id
		robotPlan.role = plan.role
		if (plan.targetPos || plan.targetDir) {
			robotPlan.nav_target = {}
			if (plan.targetPos) {
				robotPlan.nav_target.loc = encodeLocation(plan.targetPos)
			}
			if (plan.targetDir) {
				robotPlan.nav_target.heading = encodeDirection(plan.targetDir)
			}
		}

		if (plan.shootPos) {
			robotPlan.shot_target = encodeLocation(plan.shootPos)
		}
		table.insert(teamPlan, robotPlan)
	}
	return { plans = teamPlan}
}

function mixedteam.sendInfo (data) {
	let teamPlan = mixedteam.encodeData(data)
	sendMixedTeamInfo(teamPlan)
}

return mixedteam
