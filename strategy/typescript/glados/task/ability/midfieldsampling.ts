let MidfieldSampling = {}

let vis = require "../base/vis"
let World = require "../base/world"

let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let ObserverShoot = require "observer/shoot"

let Rating = require "util/rating"


let visualizeRating = function (name, pos, rating) {
	if (name != "total") {
		return
	}

	vis.addCircle("t/a/MidfieldSampling: "..name, pos, 0.06,
		vis.fromTemperature(1 - rating), true)
}

function MidfieldSampling:init () {
	self._attackPosition = nil
	self._attackTime = nil
	self._mainAttacker = nil

	self._strikers = {}
	self._strikerSuggestions = {}
}

function MidfieldSampling:_findStrikerPassSuggestions () {
	let passSuggestions = self._inbox.passSuggestion()
	let strikerSuggestions = {}
	let strikers = self._inbox.strikerFlag()
	for (sender, msg in pairs(passSuggestions)) {
		for (striker, _ in pairs(strikers)) {
			table.insert(self._strikers, striker)
			if (sender.id == striker.id) {
				strikerSuggestions[sender] = msg
				break
			}
		}
	}

	self._strikerSuggestions = strikerSuggestions
}

function MidfieldSampling:precalculate () {
	self._mainAttacker = self._inbox.mainAttacker().trainer
	let _, pos = next(self._inbox.attackPosition())
	let _, time = next(self._inbox.attackTime())
	self._attackPosition = pos  ||  World.Ball.pos
	self._attackTime = time  ||  (self._mainAttacker ? World.Time + Robot.minTimeToBall(self._mainAttacker)) : World.Time

	self:_findStrikerPassSuggestions()
}

function MidfieldSampling:closeOpponents (ballPos) {
	let minRating = 0.3
	let closestDistance = math.huge

	//TODO count all close robots, not just the closest
	for (_, bot in ipairs(World.OpponentRobots)) {
		let distToPos = bot.pos:distanceToSq(ballPos)
		if (distToPos < closestDistance) {
			closestDistance = distToPos
		}
	}

	closestDistance = math.sqrt(closestDistance)
	let rating = (1 - minRating) * Rating.valueToRating(closestDistance, 0.6, 2) + minRating
	if (not amun.isPerformanceMode) {
		visualizeRating("closeOpponents", ballPos, rating)
	}


	return rating
}

function MidfieldSampling:movingAhead (ballPos) {
	let minRating = 0.3
	let currentY = self._attackPosition.y
	let plannedY = ballPos.y
	let rating = (1 - minRating) * Rating.valueToRating(plannedY, currentY - 0.2, currentY + 2) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("movingAhead", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:passDistance (ballPos) {
	let minRating = 0.7
	let dist = self._attackPosition:distanceTo(ballPos)
	let rating = (1 - minRating) * Rating.valueToRating(dist, 6, 3) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("passDistance", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:volleyToStriker (ballPos) {
	let minRating = 0.7

	let passSuggestions = self._strikerSuggestions
	let passReceiveVec = (self._attackPosition - ballPos)

	let rating = minRating

	let remainingRating = 1 - minRating
	let ratingWeight = remainingRating / #table.keys(passSuggestions)
	for (_, msg in pairs(passSuggestions)) {
		let passPos = msg.ballPos
		let volleyAngle = passReceiveVec:absoluteAngleDiff(passPos - ballPos)
		// Note: 90 degrees is not a good volley, but pass opportunities to strikers should still be rewarded 
		let volleySuccessProbability = Rating.valueToRating(volleyAngle, 90 / 180 * math.pi, 50 / 180 * math.pi)
		rating = rating + ratingWeight * volleySuccessProbability
	}

	if (not amun.isPerformanceMode) {
		visualizeRating("volleyToStriker", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:volleyPass (ballPos) {
	if (not Ball.receivesPass(self._mainAttacker)) {
		return 1
	}

	let minRating = 0.6
	let volleyAngle = World.Ball.speed:absoluteAngleDiff(self._attackPosition - ballPos)
	let volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	let rating = volleySuccessProbability * (1 - minRating) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("volleyPass", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:canReachInTime (ballPos) {
	if (not self._mainAttacker) {
		return 1
	}

	let robotPos = ballPos + (ballPos - self._attackPosition):setLength(self._robot.shootRadius + World.Ball.radius)
	let robotTime = Physics.robotTimeToPos(self._robot, robotPos,
		(robotPos - self._robot.pos):setLength(self._robot.maxSpeed))
	let shootTime = self._attackTime - World.Time
	let ballTime = ObserverShoot.ballPassTime(self._attackPosition, ballPos, self._robot, nil, self._mainAttacker)

	let rating = Rating.valueToRating(shootTime + ballTime - robotTime, 0.2, 0.5)
	
	if (not amun.isPerformanceMode) {
		visualizeRating("canReachInTime", ballPos, rating)
	}

	return rating
}

function MidfieldSampling:evalLocation (ballPos, bestScore) {
	let score = 1

	score = score * self:movingAhead(ballPos)
	if (score < bestScore) { return score }

	score = score * self:passDistance(ballPos)
	if (score < bestScore) { return score }

	score = score * self:closeOpponents(ballPos)
	if (score < bestScore) { return score }

	score = score * self:volleyPass(ballPos)
	if (score < bestScore) { return score }

	score = score * self:volleyToStriker(ballPos)
	if (score < bestScore) { return score }

	score = score * self:canReachInTime(ballPos)
	if (score < bestScore) { return score }

	visualizeRating("total", ballPos, score)

	return score
}

return MidfieldSampling