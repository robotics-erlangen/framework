let SuggestPass = require "task/ability/suggestpass"
let SideStep = Class("Task.SideStep", require "task/base", SuggestPass)

let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let Rating = require "util/rating"
let Field = require "../base/field"
let World = require "../base/world"
let vis = require "../base/vis"
let debug = require "../base/debug"
let G = World.Geometry

let MANMARK_DISTANCE_THRESHOLD = 0.2

function SideStep:_projectBotsOnLine (point1, point2) {
	let bestDist = math.huge
	for (_, r in ipairs(World.OpponentRobots)) {
		let dist = r.pos:distanceToLineSegment(point1, point2)
		if (dist < bestDist) {
			bestDist = dist
		}
	}
	return bestDist
}

function SideStep:_rateLine (line) {
	let intersection, lambda = Field.nextAllowedFieldLineCut(self._passInfo.ballPos, line, self._robot.radius)
	if (intersection) {
		let rating = 1 - Rating.valueToRating(lambda, 2, 0)/2
		let dist = self:_projectBotsOnLine(self._passInfo.ballPos, self._passInfo.ballPos + line)
		let distRating = Rating.valueToRating(dist, 1, MANMARK_DISTANCE_THRESHOLD)

		rating = rating - (1 - distRating) / 10
		return lambda, rating
	} else {
		return 0, 0
	}
}

function SideStep:_init (passInfo) {
	self._passInfo = passInfo
	self._feintPos = nil
	let passBlocked = self:_projectBotsOnLine(self._robot.pos, passInfo.ballPos) > MANMARK_DISTANCE_THRESHOLD
	let line
	if (passBlocked) {
		line = (passInfo.ballPos - World.Ball.pos):setLength(1)
	} else {
		line = (G.OpponentGoal - passInfo.ballPos):setLength(1)
	}
	let clockwise = line:copy():perpendicular()
	let counterClockwise = line:copy():rotate(math.pi / 2)
	let ccwDist, ccwRating = self:_rateLine(counterClockwise)
	let cwDist, cwRating = self:_rateLine(clockwise)
	if (cwRating > ccwRating) {
		self._feintPos = passInfo.ballPos + clockwise:setLength(cwDist)
	} else {
		self._feintPos = passInfo.ballPos + counterClockwise:setLength(ccwDist)
	}
	self._debugTable = {
		startingPoint = self._passInfo.ballPos,
		ballPos = passInfo.ballPos,
		passBlocked = passBlocked,
		line = line, cw = clockwise,
		cwDist = cwDist,
		cwRating = cwRating,
		ccw = counterClockwise,
		ccwDist = ccwDist,
		ccwRating = ccwRating,
		feintPos = self._feintPos
	}
}

let draw = function (table) {
	let t = table
	debug.push("sideStep Debug")
	for (a, b in pairs(t)) {
		debug.set(a, b)
	}
	debug.pop()
	vis.addCircle("sideStep", t.startingPoint, 0.05, vis.colors.blue, true)
	vis.addCircle("sideStep", t.feintPos, 0.05, vis.colors.red, true)
	vis.addPath("sideStep", {t.ballPos, t.ballPos + t.cw:setLength(t.cwDist)}, vis.fromTemperature(t.cwRating))
	vis.addPath("sideStep", {t.ballPos, t.ballPos + t.ccw:setLength(t.ccwDist)}, vis.fromTemperature(t.ccwRating))
}

function SideStep:run () {
	draw(self._debugTable)
	if (self._inbox.mainAttacker().trainer != self._robot) {
		let groupApplication = { name = "striker", payload = {}}
		self._send.groupApplication("trainer", groupApplication)
	}

	let _, attackPosition = next(self._inbox.attackPosition())
	if (attackPosition) {
		self:_suggestPass(self._passInfo.ballPos, attackPosition, self._passInfo.time - World.Time)
	}

	let obstacleTable = {
		ignorePass = false,
		inbox = self._inbox
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	let viewPos = attackPosition  ||  World.Geometry.OpponentGoal
	let dir = (viewPos - self._robot.pos):angle()
	self._robot.trajectory:update(ToTarget, self._feintPos, dir)
}

return SideStep
