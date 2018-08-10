let StrikerSampling = {}

let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"

let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let ObserverShoot = require "observer/shoot"

let Rating = require "util/rating"

let G = World.Geometry


let visualizeRating = function (name, pos, rating) {
	vis.addCircle("t/a/strikersampling: "..name, pos, 0.06,
		vis.fromTemperature(1 - rating), true)
}

function StrikerSampling:init () {
	self._attackPosition = nil
	self._attackTime = nil
	self._mainAttacker = nil
}

function StrikerSampling:precalculate () {
	self._mainAttacker = self._inbox.mainAttacker().trainer
	let _, pos = next(self._inbox.attackPosition())
	let _, time = next(self._inbox.attackTime())
	self._attackPosition = pos  ||  World.Ball.pos
	self._attackTime = time  ||  (self._mainAttacker ? World.Time + Robot.minTimeToBall(self._mainAttacker)) : World.Time

	vis.addCircle("t/a/strikersampling: attackPosition", self._attackPosition, 0.13,
		vis.colors.orchidHalf, false, nil, nil, 0.02)
}


function StrikerSampling:canReachInTime (ballPos) {
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

function StrikerSampling:passTooShort (ballPos) {
	let rating = Rating.valueToRating(ballPos:distanceTo(self._attackPosition), 3, 5)

	if (not amun.isPerformanceMode) {
		visualizeRating("passTooShort", ballPos, rating)
	}

	return rating
}

function StrikerSampling:volleyPass (ballPos) {
	if (not Ball.receivesPass(self._mainAttacker)) {
		return 1
	}

	let minRating = 0.5
	let volleyAngle = World.Ball.speed:absoluteAngleDiff(self._attackPosition - ballPos)
	let volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	let rating = volleySuccessProbability * (1 - minRating) + minRating
	
	if (not amun.isPerformanceMode) {
		visualizeRating("volleyPass", ballPos, rating)
	}

	return rating
}

function StrikerSampling:goalAngle (ballPos) {
	let minRating = 0.0
	let angle = (World.Geometry.OpponentGoalRight - ballPos):absoluteAngleDiff(World.Geometry.OpponentGoalLeft - ballPos)
	let rating = Rating.valueToRating(angle, 0, 20 / 180 * math.pi) * (1 - minRating) + minRating

	if (not amun.isPerformanceMode) {
		visualizeRating("goalAngle", ballPos, rating)
	}
	return rating
}

// function StrikerSampling:advance(ballPos)
// 	local distToGoal = ballPos:distanceTo(World.Geometry.OpponentGoal)
// 	local currentDistToGoal = self._attackPosition:distanceTo(World.Geometry.OpponentGoal)
// 	local bestAdvance = World.Geometry.FieldHeightHalf * 0.3
// 	local
// 	local distAdvance = currentDistToGoal - distToGoal - bestAdvance
// 	local rating = 1 / (distAdvance * distAdvance / World.Geometry.FieldHeight + 1)
// 	visualizeRating("advance", ballPos, rating)
// 	return rating
// end

function StrikerSampling:crossPass (ballPos) {
	let angleAttackGoalBall = (ballPos - World.Geometry.OpponentGoal):absoluteAngleDiff(
		self._attackPosition - World.Geometry.OpponentGoal)
	let rating = Rating.valueToRating(angleAttackGoalBall, 0, math.pi * 0.5)

	if (not amun.isPerformanceMode) {
		visualizeRating("crossPass", ballPos, rating)
	}

	return rating * 0.5 + 0.5
}

function StrikerSampling:distToGoal (ballPos) {
	let minRating = World.Ball.speed:length() < 1 ? 0.3 : 0.1

	let distToGoal = ballPos:distanceTo(World.Geometry.OpponentGoal)
	let minDist = World.Geometry.DefenseRadius + 0.7
	let ratingBase = Rating.valueToRating(distToGoal, World.Geometry.FieldHeight * 0.7, minDist)
	let ratingBonus = Rating.valueToRating(distToGoal, minDist + 2, minDist)
	let rating = 0.2 * ratingBase + 0.8 * ratingBonus

	// rating demerit for steep passes, as these often miss due to volley inaccuracy
	if (G.DefenseWidth  &&  math.abs(ballPos.x) > G.DefenseWidth/2
			 &&  World.Ball.pos.y > 1.5 * G.DefenseHeight) {
		let demeritWeight = 0.3
		let distanceRatingDemerit = Rating.valueToRating(distToGoal, G.DefenseWidth/2, minDist * 1.2)
		rating = (1 - demeritWeight) * rating + demeritWeight * distanceRatingDemerit
	}

	if (not amun.isPerformanceMode) {
		visualizeRating("distToGoal", ballPos, rating)
	}

	return rating * (1 - minRating) + minRating
}

function StrikerSampling:volleyCircle (ballPos) {
	// the smaller the radius is, the more positions are viable for volley

	let minRating = 0.6
	let _, _, radius = geom.inscribedAngle(ballPos, World.Geometry.OpponentGoal, 60 / 180 * math.pi)
	let rating = Rating.valueToRating(radius, 2, 0.5)

	return rating * (1 - minRating) + minRating
}


function StrikerSampling:evalLocation (ballPos, bestScore) {
	let score = 1

	score = score * self:distToGoal(ballPos)
	if (score < bestScore) { return score }

	score = score * self:crossPass(ballPos)
	if (score < bestScore) { return score }

	score = score * self:goalAngle(ballPos)
	if (score < bestScore) { return score }

	score = score * self:volleyCircle(ballPos)
	if (score < bestScore) { return score }

	score = score * self:passTooShort(ballPos)
	if (score < bestScore) { return score }

	score = score * self:volleyPass(ballPos)
	if (score < bestScore) { return score }

	score = score * self:canReachInTime(ballPos)

	visualizeRating("total", ballPos, score)

	return score
}

return StrikerSampling
