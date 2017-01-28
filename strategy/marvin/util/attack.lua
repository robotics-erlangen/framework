local Attack = {}

local Cache = require "../base/cache"
local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Rating = require "util/rating"

function Attack.ratePass(robot, pass, considerTiming)
	local rating = 1

	-- rate distance
	local distanceToMA = robot.pos:distanceTo(pass.pos)
	rating = rating * Rating.valueToRating(distanceToMA, 1, 2)

	-- rate timing
	if considerTiming then
		local shootTime
		if Ball.receivesPass(robot) then
			local dribblerPos = robot.pos + (World.Ball.pos - robot.pos):setLength(
				robot.shootRadius + World.Ball.radius)
			shootTime = Physics.checkedBallRollTime(World.Ball, dribblerPos)
		else
			shootTime = Robot.minShootTime(robot, pass.pos)
		end
		local shootPos = Physics.ballAtTime(World.Ball, shootTime).pos
		local passTime = Shoot.ballPassTime(shootPos, pass.pos, pass.target)
		local ballArrivalTime = shootTime + passTime + World.Time
		rating = rating * Rating.valueToRating(ballArrivalTime - pass.time, -0.1, 0.1)
	end

	-- rate volley
	if Ball.receivesPass(robot) then
		local volleyAngle = World.Ball.speed:absoluteAngleDiff(robot.pos - pass.pos)
		rating = rating * Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
	end

	vis.addCircle("u/a/ratePass: rating", pass.pos, 0.2,
		vis.fromTemperature(1 - rating, 127), true)

	return rating
end

function Attack.choosePass(robot, passes, currentPassPos, considerTiming)
	local bestPass
	local bestPassRating = -math.huge
	for _,pass in ipairs(passes) do
		local rating = Attack.ratePass(robot, pass, considerTiming)
		if rating > 0 then
			-- give a bonus if the pos is near the currentPassPos
			if currentPassPos then
				local ratingHystDistance = 0.1
				local ratingHystPercentage = 0.1
				rating = rating * (1 + ratingHystPercentage *
					Rating.valueToRating(pass.pos:distanceTo(currentPassPos), ratingHystDistance, 0))
			end

			if rating > bestPassRating then
				bestPass = pass
				bestPassRating = rating
			end
		end
	end

	return bestPass, bestPassRating
end

function Attack.choosePassFromSuggestions(robot, passSuggestions, currentPassPos, considerTiming)
	local passes = {}
	for sender, sugg in pairs(passSuggestions) do
		table.insert(passes, {target = sender, pos = sugg.pos, time = sugg.time })
	end
	return Attack.choosePass(robot, passes, currentPassPos, considerTiming)
end

function Attack.visualizeAttack(robotPos, attackPos)
	local color = World.TeamIsBlue and vis.fromRGBA(38, 48, 217, 63) or vis.fromRGBA(244, 214, 31, 63)
	vis.addPath("u/a/Attack", {robotPos, attackPos}, color, nil, nil, 0.1)
end

local lastCPMA = nil
local lastPasser = nil
local lastReceiver = nil
function Attack.currentPlannedMainAttacker(passInfo)
	local passInfoSender, passInfoMessage = next(passInfo)
	if passInfoSender and Robot.hadBall(passInfoSender, 0) then
		lastPasser = passInfoSender
		lastReceiver = passInfoMessage.target
	end

	debug.set("plannedMA/lastCPMA", lastCPMA)
	debug.set("plannedMA/lastPasser", lastPasser)
	debug.set("plannedMA/lastReceiver", lastReceiver)

	if lastPasser and Ball.wasShot(0.2) == lastPasser
			and World.Ball.speed:length() > 1 and World.Ball.speed:absoluteAngleDiff(
				lastReceiver.pos - World.Ball.pos) < 45 / 180 * math.pi then
		lastCPMA = lastReceiver
		return lastCPMA
	end

	if lastCPMA and World.Ball.speed:length() > 1 and World.Ball.speed:absoluteAngleDiff(
				lastCPMA.pos - World.Ball.pos) < 45 / 180 * math.pi then
		return lastCPMA
	end

	lastCPMA = nil
end
Attack.currentPlannedMainAttacker = Cache.forFrame(Attack.currentPlannedMainAttacker)

return Attack