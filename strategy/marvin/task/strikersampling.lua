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
	self._mainAttacker = nil
end

function StrikerSampling:precalculate()
	local _, pos = next(self._inbox.attackPosition())
	self._attackPosition = pos or World.Ball.pos
	self._mainAttacker = self._inbox.mainAttacker().trainer

	vis.addCircle("t/a/strikersampling: attackPosition", self._attackPosition, 0.13,
		vis.colors.orchidHalf, false, nil, nil, 0.02)
end


function StrikerSampling:canReachInTime(pos)
	if not self._mainAttacker then
		return 1
	end

	local shootPos = pos + (self._attackPosition - pos):setLength(self._robot.shootRadius + World.Ball.radius)
	local robotTime = Physics.robotTimeToPos(self._robot, pos,
		(pos - self._robot.pos):setLength(self._robot.maxSpeed))
	local shootTime = Robot.minShootTime(self._mainAttacker, shootPos)
	local ballTime = ObserverShoot.ballPassTime(self._attackPosition, shootPos, self._robot)

	local rating = Rating.valueToRating(shootTime + ballTime - robotTime, 0.2, 0.5)
	visualizeRating("canReachInTime", pos, rating)
	return rating
end

function StrikerSampling:passTooShort(pos)
	local rating = Rating.valueToRating(pos:distanceTo(self._attackPosition), 2, 3)
	visualizeRating("passTooShort", pos, rating)
	return rating
end

function StrikerSampling:volleyPass(pos)
	if not Ball.receivesPass(self._mainAttacker) then
		return 1
	end

	local minRating = 0
	local volleyAngle = World.Ball.speed:absoluteAngleDiff(self._attackPosition - pos)
	local volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	local rating = volleySuccessProbability * (1 - minRating) + minRating
	visualizeRating("volleyPass", pos, rating)
	return rating
end


function StrikerSampling:evalLocation(pos)
	local score = 1

	-- score = score * self:correctFieldHalf(pos)
	-- score = score * self:openAngle(pos)
	-- score = score * self:posNearEnough(pos)
	-- score = score * self:dontDriveIntoPass(pos)
	-- score = score * self:distanceToOtherRobots(pos)
	-- score = score * self:distanceToAttackers(pos)
	-- score = score * self:oneTouchShot(pos)
	-- score = score * self:dontAnnoyMainAttacker(pos)
	-- score = score * self:passInterception(pos)

	score = score * self:passTooShort(pos)
	score = score * self:volleyPass(pos)
	score = score * self:canReachInTime(pos)
	visualizeRating("total", pos, score)

	return score
end

return StrikerSampling
