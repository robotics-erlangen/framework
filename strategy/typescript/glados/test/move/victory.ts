let Victory = Class("Group.Move.Victory", require "group/move/base")

let World = require "../base/world"
let G = World.Geometry

let MoveToPos = require "task/shared/movetopos"
let VictoryTask = require "task/test/victory"

let vis = require "../base/vis"

Victory.MIN_ROBOTS = 3
Victory.MAX_ROBOTS = 12

function Victory.canStart () { // TODO
	return true
}

function Victory:_init () {
	self._state = "init"
}

function Victory:_canContinue () { // TODO
	return true
}

function Victory:_updateTasks () {
	let taskAssignments = {}

	let nRobots = #self._robots
	// TODO: radius sinnvoller
	let radius = (G.FieldHeightHalf - G.DefenseRadius) / 2
	let center = Vector(0, -radius - 0.75)
	radius = radius - 0.5
	vis.addCircle("test", center, 0.05, vis.colors.yellow, true)
	let angleStep = 2 * math.pi / nRobots

	if (self._state == "init") { // todo startposition fixen
		for (i, _ in ipairs(self._robots)) {
			let angle = i * angleStep
			let moveLine = Vector.fromAngle(angle):setLength(radius/2)
			let pos = center - Vector(0, -radius/2) + moveLine
			taskAssignments[self._robots[i]] = { class = MoveToPos, params = {pos}}
			if (self._robots[i].pos:distanceTo(pos) > 0.1) {
				self._state = "circle"
			}
		}
	} else if (self._state == "circle") {
		for (i, _ in ipairs(self._robots)) {
			let angle = (i-1) * angleStep
			taskAssignments[self._robots[i]] = { class = VictoryTask, params = {center, 0, angle, radius}}
		}
	}

	return taskAssignments
}
return Victory
