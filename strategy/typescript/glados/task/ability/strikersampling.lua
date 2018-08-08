local StrikerSampling = {}

local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local Rating = require "util/rating"

local G = World.Geometry


local function visualizeRating(name, pos, rating)
	vis.addCircle("t/a/strikersampling: "..name, pos, 0.06,
		vis.fromTemperature(1 - rating), true)
end

function StrikerSampling:init()
	self._attackPosition = nil
	self._attackTime = nil
	self._mainAttacker = nil
end

function StrikerSampling:precalculate()
	self._mainAttacker = self._inbox.mainAttacker().trainer
	local _, pos = next(self._inbox.attackPosition())
	local _, time = next(self._inbox.attackTime())
	self._attackPosition = pos or World.Ball.pos
	self._attackTime = time or (self._mainAttacker and World.Time + Robot.minTimeToBall(self._mainAttacker)) or World.Time

	vis.addCircle("t/a/strikersampling: attackPosition", self._attackPosition, 0.13,
		vis.colors.orchidHalf, false, nil, nil, 0.02)
end


function StrikerSampling:canReachInTime(ballPos)
	if not self._mainAttacker then
		return 1
	end

	local robotPos = ballPos + (ballPos - self._attackPosition):setLength(self._robot.shootRadius + World.Ball.radius)
	local robotTime = Physics.robotTimeToPos(self._robot, robotPos,
		(robotPos - self._robot.pos):setLength(self._robot.maxSpeed))
	local shootTime = self._attackTime - World.Time
	local ballTime = ObserverShoot.ballPassTime(self._attackPosition, ballPos, self._robot, nil, self._mainAttacker)

	local rating = Rating.valueToRating(shootTime + ballTime - robotTime, 0.2, 0.5)
	
	if not amun.isPerformanceMode then
		visualizeRating("canReachInTime", ballPos, rating)
	end

	return rating
end

function StrikerSampling:passTooShort(ballPos)
	local rating = Rating.valueToRating(ballPos:distanceTo(self._attackPosition), 3, 5)

	if not amun.isPerformanceMode then
		visualizeRating("passTooShort", ballPos, rating)
	end

	return rating
end

function StrikerSampling:volleyPass(ballPos)
	if not Ball.receivesPass(self._mainAttacker) then
		return 1
	end

	local minRating = 0.5
	local volleyAngle = World.Ball.speed:absoluteAngleDiff(self._attackPosition - ballPos)
	local volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	local rating = volleySuccessProbability * (1 - minRating) + minRating
	
	if not amun.isPerformanceMode then
		visualizeRating("volleyPass", ballPos, rating)
	end

	return rating
end

function StrikerSampling:goalAngle(ballPos)
	local minRating = 0.0
	local angle = (World.Geometry.OpponentGoalRight - ballPos):absoluteAngleDiff(World.Geometry.OpponentGoalLeft - ballPos)
	local rating = Rating.valueToRating(angle, 0, 20 / 180 * math.pi) * (1 - minRating) + minRating

	if not amun.isPerformanceMode then
		visualizeRating("goalAngle", ballPos, rating)
	end
	return rating
end

-- function StrikerSampling:advance(ballPos)
-- 	local distToGoal = ballPos:distanceTo(World.Geometry.OpponentGoal)
-- 	local currentDistToGoal = self._attackPosition:distanceTo(World.Geometry.OpponentGoal)
-- 	local bestAdvance = World.Geometry.FieldHeightHalf * 0.3
-- 	local
-- 	local distAdvance = currentDistToGoal - distToGoal - bestAdvance
-- 	local rating = 1 / (distAdvance * distAdvance / World.Geometry.FieldHeight + 1)
-- 	visualizeRating("advance", ballPos, rating)
-- 	return rating
-- end

function StrikerSampling:crossPass(ballPos)
	local angleAttackGoalBall = (ballPos - World.Geometry.OpponentGoal):absoluteAngleDiff(
		self._attackPosition - World.Geometry.OpponentGoal)
	local rating = Rating.valueToRating(angleAttackGoalBall, 0, math.pi * 0.5)

	if not amun.isPerformanceMode then
		visualizeRating("crossPass", ballPos, rating)
	end

	return rating * 0.5 + 0.5
end

function StrikerSampling:distToGoal(ballPos)
	local minRating = World.Ball.speed:length() < 1 and 0.3 or 0.1

	local distToGoal = ballPos:distanceTo(World.Geometry.OpponentGoal)
	local minDist = World.Geometry.DefenseRadius + 0.7
	local ratingBase = Rating.valueToRating(distToGoal, World.Geometry.FieldHeight * 0.7, minDist)
	local ratingBonus = Rating.valueToRating(distToGoal, minDist + 2, minDist)
	local rating = 0.2 * ratingBase + 0.8 * ratingBonus

	-- rating demerit for steep passes, as these often miss due to volley inaccuracy
	if G.DefenseWidth and math.abs(ballPos.x) > G.DefenseWidth/2
			and World.Ball.pos.y > 1.5 * G.DefenseHeight then
		local demeritWeight = 0.3
		local distanceRatingDemerit = Rating.valueToRating(distToGoal, G.DefenseWidth/2, minDist * 1.2)
		rating = (1 - demeritWeight) * rating + demeritWeight * distanceRatingDemerit
	end

	if not amun.isPerformanceMode then
		visualizeRating("distToGoal", ballPos, rating)
	end

	return rating * (1 - minRating) + minRating
end

function StrikerSampling:volleyCircle(ballPos)
	-- the smaller the radius is, the more positions are viable for volley

	local minRating = 0.6
	local _, _, radius = geom.inscribedAngle(ballPos, World.Geometry.OpponentGoal, 60 / 180 * math.pi)
	local rating = Rating.valueToRating(radius, 2, 0.5)

	return rating * (1 - minRating) + minRating
end


function StrikerSampling:evalLocation(ballPos, bestScore)
	local score = 1

	score = score * self:distToGoal(ballPos)
	if score < bestScore then return score end

	score = score * self:crossPass(ballPos)
	if score < bestScore then return score end

	score = score * self:goalAngle(ballPos)
	if score < bestScore then return score end

	score = score * self:volleyCircle(ballPos)
	if score < bestScore then return score end

	score = score * self:passTooShort(ballPos)
	if score < bestScore then return score end

	score = score * self:volleyPass(ballPos)
	if score < bestScore then return score end

	score = score * self:canReachInTime(ballPos)

	visualizeRating("total", ballPos, score)

	return score
end

return StrikerSampling
