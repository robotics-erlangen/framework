local MidfieldSampling = {}

local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local ObserverShoot = require "observer/shoot"

local Rating = require "util/rating"


local function visualizeRating(name, pos, rating)
	if name ~= "total" then
		return
	end

	vis.addCircle("t/a/MidfieldSampling: "..name, pos, 0.06,
		vis.fromTemperature(1 - rating), true)
end

function MidfieldSampling:init()
	self._attackPosition = nil
	self._attackTime = nil
	self._mainAttacker = nil

	self._strikers = {}
	self._strikerSuggestions = {}
end

function MidfieldSampling:_findStrikerPassSuggestions()
	local passSuggestions = self._inbox.passSuggestion()
	local strikerSuggestions = {}
	local strikers = self._inbox.strikerFlag()
	for sender, msg in pairs(passSuggestions) do
		for striker, _ in pairs(strikers) do
			table.insert(self._strikers, striker)
			if sender.id == striker.id then
				strikerSuggestions[sender] = msg
				break
			end
		end
	end

	self._strikerSuggestions = strikerSuggestions
end

function MidfieldSampling:precalculate()
	self._mainAttacker = self._inbox.mainAttacker().trainer
	local _, pos = next(self._inbox.attackPosition())
	local _, time = next(self._inbox.attackTime())
	self._attackPosition = pos or World.Ball.pos
	self._attackTime = time or (self._mainAttacker and World.Time + Robot.minTimeToBall(self._mainAttacker)) or World.Time

	self:_findStrikerPassSuggestions()
end

function MidfieldSampling:closeOpponents(ballPos)
	local minRating = 0.3
	local closestDistance = math.huge

	--TODO count all close robots, not just the closest
	for _, bot in ipairs(World.OpponentRobots) do
		local distToPos = bot.pos:distanceToSq(ballPos)
		if distToPos < closestDistance then
			closestDistance = distToPos
		end
	end

	closestDistance = math.sqrt(closestDistance)
	local rating = (1 - minRating) * Rating.valueToRating(closestDistance, 0.6, 2) + minRating
	if not amun.isPerformanceMode then
		visualizeRating("closeOpponents", ballPos, rating)
	end


	return rating
end

function MidfieldSampling:movingAhead(ballPos)
	local minRating = 0.3
	local currentY = self._attackPosition.y
	local plannedY = ballPos.y
	local rating = (1 - minRating) * Rating.valueToRating(plannedY, currentY - 0.2, currentY + 2) + minRating

	if not amun.isPerformanceMode then
		visualizeRating("movingAhead", ballPos, rating)
	end

	return rating
end

function MidfieldSampling:passDistance(ballPos)
	local minRating = 0.4
	local dist = self._attackPosition:distanceTo(ballPos)
	local rating = (1 - minRating) * Rating.valueToRating(dist, 6, 3) + minRating

	if not amun.isPerformanceMode then
		visualizeRating("passDistance", ballPos, rating)
	end

	return rating
end

function MidfieldSampling:volleyToStriker(ballPos)
	local minRating = 0.7

	local passSuggestions = self._strikerSuggestions
	local passReceiveVec = (self._attackPosition - ballPos)

	local rating = minRating

	local remainingRating = 1 - minRating
	local ratingWeight = remainingRating / #table.keys(passSuggestions)
	for _, msg in pairs(passSuggestions) do
		local passPos = msg.ballPos
		local volleyAngle = passReceiveVec:absoluteAngleDiff(passPos - ballPos)
		-- Note: 90 degrees is not a good volley, but pass opportunities to strikers should still be rewarded 
		local volleySuccessProbability = Rating.valueToRating(volleyAngle, 90 / 180 * math.pi, 50 / 180 * math.pi)
		rating = rating + ratingWeight * volleySuccessProbability
	end

	if not amun.isPerformanceMode then
		visualizeRating("volleyToStriker", ballPos, rating)
	end

	return rating
end

function MidfieldSampling:volleyPass(ballPos)
	if not Ball.receivesPass(self._mainAttacker) then
		return 1
	end

	local minRating = 0.6
	local volleyAngle = World.Ball.speed:absoluteAngleDiff(self._attackPosition - ballPos)
	local volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	local rating = volleySuccessProbability * (1 - minRating) + minRating

	if not amun.isPerformanceMode then
		visualizeRating("volleyPass", ballPos, rating)
	end

	return rating
end

function MidfieldSampling:canReachInTime(ballPos)
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

function MidfieldSampling:evalLocation(ballPos, bestScore)
	local score = 1

	score = score * self:movingAhead(ballPos)
	if score < bestScore then return score end

	-- score = score * self:passDistance(ballPos)
	-- if score < bestScore then return score end

	score = score * self:closeOpponents(ballPos)
	if score < bestScore then return score end

	score = score * self:volleyPass(ballPos)
	if score < bestScore then return score end

	score = score * self:volleyToStriker(ballPos)
	if score < bestScore then return score end

	score = score * self:canReachInTime(ballPos)
	if score < bestScore then return score end

	visualizeRating("total", ballPos, score)

	return score
end

return MidfieldSampling