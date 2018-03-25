local InterceptPass = Class("Task.InterceptPass", require "task/base")

local Cache = require "../base/cache"
local Field = require "../base/field"
local World = require "../base/world"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function InterceptPass:_init()
end

local function minMovePos(robot)
	local minTime = Robot.minTimeToBall(robot)
	local futureBallPos = Physics.ballAtTime(minTime)
	-- TODO: schneller, stärker, besser
	return futureBallPos
end
InterceptPass.minMovePos = Cache.forFrame(minMovePos)

local function evaulateInterceptPosition(robot, pos)
	local OPP_EXTRA_TIME = 0.05

	if pos.y < robot.pos.y + robot.radius * 2 then
		return -math.huge, math.huge
	end
	if not Field.isInAllowedField(pos, -robot.radius * 2) then
		-- it either goes through the defense area (dont intercept) or is out of field
		return -1, math.huge
	end
	local ownTime = Physics.robotTimeToPos(robot, pos, Vector(robot.maxSpeed, 0))
	local bestOppTime = math.huge
	for _, oppRobot in ipairs(World.OpponentRobots) do
		if oppRobot.pos:distanceTo(pos) < 3 * robot.pos:distanceTo(pos) then
			local oppTime = Physics.robotTimeToPos(oppRobot, pos, Vector(robot.maxSpeed, 0))
			if oppTime < ownTime + OPP_EXTRA_TIME then
				return -math.huge, ownTime, bestOppTime
			end
			bestOppTime = math.min(bestOppTime, oppTime)
		end
	end
	if bestOppTime < ownTime + OPP_EXTRA_TIME then
		return -math.huge, ownTime, bestOppTime
	end
	return ownTime - bestOppTime, ownTime, bestOppTime
end

local lastPositions = {}
local function calculateInterceptPos(robot)
	local BALL_EXTRA_TIME = 0.05
	local HYST_TIME = 0.1
	-- make sure the last position is reasonable and valid
	if lastPositions[robot] and World.Ball.speed:length() > 0.5 then
		local pos, dist = lastPositions[robot]:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		if dist > 0.2 then
			lastPositions[robot] = nil
		else
			lastPositions[robot] = pos
		end
	end

	-- evaluate a few positions on the line
	local minTime = Robot.minTimeToBall(robot) + BALL_EXTRA_TIME
	local ballOutTime = Physics.ballOutTime(World.Ball, 0)
	local predictedOpp = Goal.predictShot() -- TODO: ball oder roboterposition
	local minOppTime = Physics.ballTravelTime(World.Ball, predictedOpp:distanceTo(World.Ball.pos))
	local maxTime = math.min(ballOutTime, minOppTime)

	local bestPos
	local bestRating = -math.huge
	local bestRatingOppTime = math.huge
	local posTime
	for i = -1, 10 do
		local useTime = minTime + i * (maxTime - minTime) / 10
		local futureBallPos = Physics.ballAtTime(World.Ball, useTime).pos
		local rating = 0
		if i == -1 then
			rating = rating + (lastPositions[robot] and HYST_TIME or 0)
			futureBallPos = lastPositions[robot] or futureBallPos
		end
		local evaluation, ownTime, bestOppTime = evaulateInterceptPosition(robot, futureBallPos)
		if evaluation == -1 and i ~= -1 then
			break
		end
		rating = rating + evaluation
		if rating > bestRating then
			bestRating = rating
			bestPos = futureBallPos
			posTime = ownTime
			bestRatingOppTime = bestOppTime
		end
	end
	lastPositions[robot] = bestPos
	return bestPos, posTime, bestRatingOppTime, bestRating
end
InterceptPass.calculateInterceptPos = Cache.forFrame(calculateInterceptPos)

local obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreOpponentRobots = true,
}

function InterceptPass:run()
	local moveDest = self.calculateInterceptPos(self._robot)
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local dir = (-World.Ball.speed):angle()
	local endSpeed = (World.Ball.pos - self._robot.pos):setLength(2)
	self._robot.trajectory:update(ToTarget, moveDest, dir, nil, endSpeed)
end

return InterceptPass
