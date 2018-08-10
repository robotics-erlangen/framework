let Roles = {}

let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"


let ROLE_HYSTERESIS = 0.05

function Roles:init () {
	self._exclusiveRoles = {}
}

function Roles:_chooseExclusiveRoles () {
	let roleHysteresis = ROLE_HYSTERESIS
	if (Referee.isStopState()) {
		roleHysteresis = 1
	}

	let roleMsgs = self._inbox.exclusiveRole()
	let roleApplications = {}
	for (robot, applications in pairs(roleMsgs)) {
		for (_, application in ipairs(applications)) {
			for (role, rating in pairs(application)) {
				if (not roleApplications[role]) {
					roleApplications[role] = {}
				}
				roleApplications[role][robot] = rating
			}
		}
	}

	let exclusiveRoles = {} // ensure that special roles are removed if no one applies
	for (role, applications in pairs(roleApplications)) {
		let bestRobot = nil
		let bestRating = -math.huge
		for (robot, rating in pairs(applications)) {
			if (self._exclusiveRoles[role] == robot) {
				rating = rating + roleHysteresis
			}
			if (rating > bestRating) {
				bestRobot = robot
				bestRating = rating
			}
		}
		if (bestRobot) {
			exclusiveRoles[role] = bestRobot
			self._send[role]("all", bestRobot)

			vis.addCircle("tr/roles: "..role, bestRobot.pos, 0.12,
				World.TeamIsBlue ? vis.colors.blue : vis.colors.yellow, true, true)
		}
	}
	self._exclusiveRoles = exclusiveRoles
}

return Roles
