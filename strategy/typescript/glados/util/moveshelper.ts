let MovesHelper = {}

let geom = require "../base/geom"
let vis = require "../base/vis"

// this function draws the two circles, in which a volley pass is not possible
// it also returns the values from the indiscribed angle theorem
// this MUST be considered in every static freekick
function MovesHelper.volleyCircle (point1, point2, theta) {
	let center1, center2, radius = geom.inscribedAngle(point1, point2, theta)
	vis.addCircle("volleyCycle", center1, radius, vis.colors.redHalf, true)
	vis.addCircle("volleyCycle", center2, radius, vis.colors.redHalf, true)
	return center1, center2, radius
}

let createOptionsTableRec = function (options) {
	let lastTable = {{}}
	if (options > 1) {
		lastTable = createOptionsTableRec(options - 1)
	}
	let resultTable = {}
	for (_, part  in ipairs(lastTable)) {
		for (i = 1,options) {
			let partCopy = table.copy(part)
			table.insert(partCopy, i, options)
			table.insert(resultTable, partCopy)
		}
	}
	return resultTable
}

// this function performs a least squares optimization of the distance
// between each robot and the assigned position
// as it uses brute force, it should not be called with more than 4 positions
// @param robots table - list of robots to assign. the first ignoreFirstNRobots are assigned to their index
// @param positions table - list of positions to assign the remaining robots to
// @param ignoreFirstNRobots number - ignore the first n robots in robots during assignment
// @return table - assignments. use like this: robots[assignment[i]] -> assign to positions[i]
function MovesHelper.assignRobots (robots, positions, ignoreFirstNRobots) {
	if (#robots - ignoreFirstNRobots != #positions) {
		log("Moveshelper: unmatching number of robots  &&  positions!")
		return
	}
	let assignment = {}
	for (i = 1, ignoreFirstNRobots) {
		table.insert(assignment, i)
	}

	let options = createOptionsTableRec(#positions)
	let bestOptionIndex
	let bestOptionScore = math.huge
	for (i, option in ipairs(options)) {
		let totalDistance = 0
		for (b, id in ipairs(option)) {
			totalDistance = totalDistance + robots[ignoreFirstNRobots + id].pos:distanceToSq(positions[b])
		}
		if (totalDistance < bestOptionScore) {
			bestOptionScore = totalDistance
			bestOptionIndex = i
		}
	}

	for (_, index in ipairs(options[bestOptionIndex])) {
		table.insert(assignment, index + ignoreFirstNRobots)
	}

	return assignment
}

return MovesHelper
