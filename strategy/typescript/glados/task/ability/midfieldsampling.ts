let MidfieldSampling = {}

import * as vis from "base/vis";
import * as World from "base/world";

import * as Ball from "glados/tobserver/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
let ObserverShoot = require "observer/shoot"

import * as Rating from "glados/util/rating";


let visualizeRating = function (name, pos, rating) {
	if (name != "total") {
		return
	}

	vis.addCircle("t/a/MidfieldSampling: "+name, pos, 0.06,
		vis.fromTemperature(1 - rating), true)
}

function MidfieldSampling:init () {
	this._attackPosition = nil
	this._attackTime = nil
	this._mainAttacker = nil

	this._strikers = {}
	this._strikerSuggestions = {}
}

function MidfieldSampling:_findStrikerPassSuggestions () {
	let passSuggestions = this._inbox.passSuggestion()
	let strikerSuggestions = {}
	let strikers = this._inbox.strikerFlag()
	for (sender, msg in pairs(passSuggestions)) {
		for (striker, _ in pairs(strikers)) {
			table.insert(this._strikers, striker)
			if (sender.id == striker.id) {
				strikerSuggestions[sender] = msg
				break
			}
		}
	}

	this._strikerSuggestions = strikerSuggestions
}

function MidfieldSampling:precalculate () {
	this._mainAttacker = this._inbox.mainAttacker().trainer
	let _, pos = next(this._inbox.attackPosition())
	let _, time = next(this._inbox.attackTime())
	this._attackPosition = pos || World.Ball.pos
	this._attackTime = time || (this._mainAttacker ? World.Time + Robot.minTimeToBall(this._mainAttacker)) : World.Time

	this._findStrikerPassSuggestions()
}

function MidfieldSampling:closeOpponents (ballPos) {
	let minRating = 0.3
	let closestDistance = Infinity

	//TODO count all close robots, not just the closest
	for (_, bot in ipairs(World.OpponentRobots)) {
		let distToPos = bot.pos.distanceToSq(ballPos)
		if (distToPos < closestDistance) {
			closestDistance = distToPos
		}
	}

	closestDistance = Math.sqrt(closestDistance)
	let rating = (1 - minRating) * Rating.valueToRating(closestDistance, 0.6, 2) + minRating
	if (not amun.isPerformanceMode) {
		visualizeRating("closeOpponents", ballPos, rating)
	}


	return rating
}

function MidfieldSampling:movingAhead (ballPos) {
	let minRating = 0.3
	let currentY = this._attackPosition.y
	let plannedY = ballPos.y
	let rating = (1 - minRating) * Rating.valueToRating(plannedY, currentY - 0.2, currentY + 2) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("movingAhead", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:passDistance (ballPos) {
	let minRating = 0.7
	let dist = this._attackPosition.distanceTo(ballPos)
	let rating = (1 - minRating) * Rating.valueToRating(dist, 6, 3) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("passDistance", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:volleyToStriker (ballPos) {
	let minRating = 0.7

	let passSuggestions = this._strikerSuggestions
	let passReceiveVec = (this._attackPosition - ballPos)

	let rating = minRating

	let remainingRating = 1 - minRating
	let ratingWeight = remainingRating / #table.keys(passSuggestions)
	for (_, msg in pairs(passSuggestions)) {
		let passPos = msg.ballPos
		let volleyAngle = passReceiveVec.absoluteAngleDiff(passPos - ballPos)
		// Note: 90 degrees is not a good volley, but pass opportunities to strikers should still be rewarded 
		let volleySuccessProbability = Rating.valueToRating(volleyAngle, 90 / 180 * Math.PI, 50 / 180 * Math.PI)
		rating = rating + ratingWeight * volleySuccessProbability
	}

	if (not amun.isPerformanceMode) {
		visualizeRating("volleyToStriker", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:volleyPass (ballPos) {
	if (not Ball.receivesPass(this._mainAttacker)) {
		return 1
	}

	let minRating = 0.6
	let volleyAngle = World.Ball.speed.absoluteAngleDiff(this._attackPosition - ballPos)
	let volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * Math.PI, 50 / 180 * Math.PI)
	let rating = volleySuccessProbability * (1 - minRating) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("volleyPass", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:canReachInTime (ballPos) {
	if (not this._mainAttacker) {
		return 1
	}

	let robotPos = ballPos + (ballPos - this._attackPosition).setLength(this._robot.shootRadius + World.Ball.radius)
	let robotTime = Physics.robotTimeToPos(this._robot, robotPos,
		(robotPos - this._robot.pos).setLength(this._robot.maxSpeed))
	let shootTime = this._attackTime - World.Time
	let ballTime = ObserverShoot.ballPassTime(this._attackPosition, ballPos, this._robot, undefined, this._mainAttacker)

	let rating = Rating.valueToRating(shootTime + ballTime - robotTime, 0.2, 0.5)
	
	if (not amun.isPerformanceMode) {
		visualizeRating("canReachInTime", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:evalLocation (ballPos, bestScore) {
	let score = 1

	score = score * this.movingAhead(ballPos)
	if (score < bestScore) { return score }

	score = score * this.passDistance(ballPos)
	if (score < bestScore) { return score }

	score = score * this.closeOpponents(ballPos)
	if (score < bestScore) { return score }

	score = score * this.volleyPass(ballPos)
	if (score < bestScore) { return score }

	score = score * this.volleyToStriker(ballPos)
	if (score < bestScore) { return score }

	score = score * this.canReachInTime(ballPos)
	if (score < bestScore) { return score }

	visualizeRating("total", ballPos, score)

	return score
}

return MidfieldSampling