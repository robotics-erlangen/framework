let RobotList = {}

let Cache = require "../base/cache"


function RobotList.join (listA, listB) {
	let joined = table.copy(listA)
	table.append(joined, listB)
	return joined
}
RobotList.join = Cache.forFrame(RobotList.join)

function RobotList.excludeRobot (list, robot) {
	let result = table.copy(list)
	for (i, r in ipairs(list)) {
		if (r == robot) {
			table.remove(result, i)
			break
		}
	}
	return result
}
RobotList.excludeRobot = Cache.forFrame(RobotList.excludeRobot)

function RobotList.excludeRobots (list, robots) {
	let result = {}
	for (_, r in ipairs(list)) {
		let found = false
		for (_, robot in ipairs(robots)) {
			if (r == robot) {
				found = true
			}
		}
		if (not found) {
			table.insert(result, r)
		}
	}
	return result
}
RobotList.excludeRobots = Cache.forFrame(RobotList.excludeRobots)

return RobotList
