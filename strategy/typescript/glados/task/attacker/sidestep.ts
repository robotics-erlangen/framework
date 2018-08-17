let SuggestPass = require "task/ability/suggestpass"
let SideStep = Class("Task.SideStep", require "task/base", SuggestPass)

import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as Rating from "glados/util/rating";
import * as Field from "base/field";
import * as World from "base/world";
import * as vis from "base/vis";
import * as debug from "base/debug";
let G = World.Geometry

let MANMARK_DISTANCE_THRESHOLD = 0.2

function SideStep:_projectBotsOnLine (point1, point2) {
	let bestDist = Infinity
	for (_, r in ipairs(World.OpponentRobots)) {
		let dist = r.pos.distanceToLineSegment(point1, point2)
		if (dist < bestDist) {
			bestDist = dist
		}
	}
	return bestDist
}

function SideStep:_rateLine (line) {
	let intersection, lambda = Field.nextAllowedFieldLineCut(this._passInfo.ballPos, line, this._robot.radius)
	if (intersection) {
		let rating = 1 - Rating.valueToRating(lambda, 2, 0)/2
		let dist = this._projectBotsOnLine(this._passInfo.ballPos, this._passInfo.ballPos + line)
		let distRating = Rating.valueToRating(dist, 1, MANMARK_DISTANCE_THRESHOLD)

		rating = rating - (1 - distRating) / 10
		return lambda, rating
	} else {
		return 0, 0
	}
}

function SideStep:_init (passInfo) {
	this._passInfo = passInfo
	this._feintPos = nil
	let passBlocked = this._projectBotsOnLine(this._robot.pos, passInfo.ballPos) > MANMARK_DISTANCE_THRESHOLD
	let line
	if (passBlocked) {
		line = (passInfo.ballPos - World.Ball.pos).setLength(1)
	} else {
		line = (G.OpponentGoal - passInfo.ballPos).setLength(1)
	}
	let clockwise = line.copy().perpendicular()
	let counterClockwise = line.copy().rotate(Math.PI / 2)
	let ccwDist, ccwRating = this._rateLine(counterClockwise)
	let cwDist, cwRating = this._rateLine(clockwise)
	if (cwRating > ccwRating) {
		this._feintPos = passInfo.ballPos + clockwise.setLength(cwDist)
	} else {
		this._feintPos = passInfo.ballPos + counterClockwise.setLength(ccwDist)
	}
	this._debugTable = {
		startingPoint = this._passInfo.ballPos,
		ballPos = passInfo.ballPos,
		passBlocked = passBlocked,
		line = line, cw = clockwise,
		cwDist = cwDist,
		cwRating = cwRating,
		ccw = counterClockwise,
		ccwDist = ccwDist,
		ccwRating = ccwRating,
		feintPos = this._feintPos
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
	vis.addPath("sideStep", {t.ballPos, t.ballPos + t.cw.setLength(t.cwDist)}, vis.fromTemperature(t.cwRating))
	vis.addPath("sideStep", {t.ballPos, t.ballPos + t.ccw.setLength(t.ccwDist)}, vis.fromTemperature(t.ccwRating))
}

function SideStep:run () {
	draw(this._debugTable)
	if (this._inbox.mainAttacker().trainer != this._robot) {
		let groupApplication = { name = "striker", payload = {}}
		this._send.groupApplication("trainer", groupApplication)
	}

	let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
	if (attackPosition) {
		this._suggestPass(this._passInfo.ballPos, attackPosition, this._passInfo.time - World.Time)
	}

	let obstacleTable = {
		ignorePass = false,
		inbox = this._inbox
	}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	let viewPos = attackPosition || World.Geometry.OpponentGoal
	let dir = (viewPos - this._robot.pos).angle()
	this._robot.trajectory.update(ToTarget, this._feintPos, dir)
}

return SideStep
