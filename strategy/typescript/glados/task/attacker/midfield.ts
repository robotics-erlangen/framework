let SuggestPass = require "task/ability/suggestpass"
let MidfieldSampling = require "task/ability/midfieldsampling"
let Midfield = Class("Task.Midfield", require "task/base", SuggestPass, MidfieldSampling)

import * as Physics from "glados/observer/physics";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";

function Midfield:_init () {
	this._passPos = nil

	// ewwwww hack
	this._frameCount = 0

	let ignore = false
	this._obstacleTable = {
		ignoreBall = ignore,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = this._inbox,
		ignorePass = (not this._inbox) || ignore,
		ignoreBallPlacementObstacle = false
	}
}

function Midfield:_samplePassPosition () {
	let zone = this._inbox.midfieldZone().trainer

	let left = zone.boundaries.left
	let right = zone.boundaries.right
	let top = zone.boundaries.top
	let bottom = zone.boundaries.bottom

	let width = right - left
	let height = top - bottom

	let xStep = width / 3
	let yStep = height / 6

	let bestScore = -Infinity
	let bestPoint = nil
	for (x = left, left + width, xStep) {
		for (y = bottom, bottom + height, yStep) {
			let candidatePoint = new Vector(x, y)
			let rating = this.evalLocation(candidatePoint, bestScore)
			if (rating > bestScore) {
				bestScore = rating
				bestPoint = candidatePoint
			}
		}
	}

	return bestPoint
}

// local disco = {
// 	vis.colors.red,
// 	vis.colors.blue,
// 	vis.colors.green,
// 	vis.colors.pink,
// 	vis.colors.turquoise,
// 	vis.colors.yellow,
// 	vis.colors.skyBlue,
// 	vis.colors.mediumPurple
// }

function Midfield:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

	this.precalculate()

	// Hacky quickfix for messaging delay problems
	if ((this._frameCount % 2) == 0) {
		this._passPos = this._samplePassPosition()
	}
	this._frameCount = this._frameCount + 1

	// local random = Math.round(Math.random() * #disco)
	// vis.addCircle("middy", this._robot.pos, 0.1, disco[random] or vis.colors.orange, true)

	let zone = this._inbox.midfieldZone().trainer
	let defaultPos = zone.defaultPos

	let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];

	let time = Physics.robotTimeToPos(this._robot, this._passPos, new Vector(0, 0))
	if (this._passPos) {
		this._suggestPass(this._passPos, attackPosition, time)
	}
	
	this._robot.trajectory.update(ToTarget, defaultPos, Math.PI/2, undefined, new Vector(0, 0))
}


return Midfield
