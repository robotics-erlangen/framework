local StrikerSampling = Class("Task.StrikerSampling", require "task/base")

local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local Rating = require "util/rating"


local function visualizeRating(name, pos, rating)
	vis.addCircle("t/a/strikersampling: "..name, pos, 0.06,
		vis.fromTemperature(1 - rating), true)
end

function StrikerSampling:_init()
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
	visualizeRating("canReachInTime", ballPos, rating)
	return rating
end

function StrikerSampling:passTooShort(ballPos)
	local rating = Rating.valueToRating(ballPos:distanceTo(self._attackPosition), 2, 3)
	visualizeRating("passTooShort", ballPos, rating)
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
	visualizeRating("volleyPass", ballPos, rating)
	return rating
end

function StrikerSampling:goalAngle(ballPos)
	local minRating = 0.0
	local angle = (World.Geometry.OpponentGoalRight - ballPos):absoluteAngleDiff(World.Geometry.OpponentGoalLeft - ballPos)
	local rating = Rating.valueToRating(angle, 0, 20 / 180 * math.pi) * (1 - minRating) + minRating
	visualizeRating("goalAngle", ballPos, rating)
	return rating
end

function StrikerSampling:distToGoal(ballPos)
	return Rating.valueToRating(ballPos:distanceTo(World.Geometry.OpponentGoal),
		World.Geometry.FieldHeight * 0.7, World.Geometry.FieldHeight * 0.2)
end


function StrikerSampling:evalLocation(ballPos, bestScore)
	local score = 1

	score = score * self:distToGoal(ballPos)
	if score < bestScore then return score end

	score = score * self:goalAngle(ballPos)
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
