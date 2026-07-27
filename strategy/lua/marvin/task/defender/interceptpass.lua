--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local InterceptPass = Class("Task.InterceptPass", require "task/base")

local Cache = require "../base/cache"
local Field = require "../base/field"
local World = require "../base/world"
local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function InterceptPass:_init()
end


local function evaluateInterceptPos(robot, pos)
	local OPP_EXTRA_TIME = 0.05

	-- checks if the pos is behind our robot
	if pos.y < robot.pos.y + 2 * robot.radius then
		return -math.huge, math.huge
	end

	-- checks if the pos is in the allowed field
	if not Field.isInAllowedField(pos, -2 * robot.radius) then
		return -math.huge, math.huge
	end

	local ownTime = Physics.robotTimeToPos(robot, pos, (pos - robot.pos):setLength(robot.maxSpeed))
	local bestOppTime = math.huge

	-- search the closest opponent
	for _, oppRobot in ipairs(World.OpponentRobots) do
		if oppRobot.pos:distanceTo(pos) < 3 * robot.pos:distanceTo(pos) then
			local oppTime = Physics.robotTimeToPos(oppRobot, pos, (pos - oppRobot.pos):setLength(robot.maxSpeed))
			if oppTime < ownTime + OPP_EXTRA_TIME then
				return -math.huge, ownTime, bestOppTime
			end

			bestOppTime = math.min(bestOppTime, oppTime)

		end
	end

	return bestOppTime - ownTime, ownTime, bestOppTime

end


-- lastPositions[robot][1] - Vector pos
-- lastPositions[robot][2] - number time (of pos)
local lastPositions = {}
local function calculateInterceptPos(robot)
	local BALL_EXTRA_TIME = 0.05
	local HYST_TIME = 0.1

	-- make sure the last position is reasonable and valid
	if lastPositions[robot] and World.Ball.speed:lengthSq() > 0.5 * 0.5 then
		local pos, dist = lastPositions[robot][1]:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
		if dist > 0.2 or World.Time - lastPositions[robot][2] > 0.5 or
				World.Ball.speed:dot(lastPositions[robot][1] - World.Ball.pos) < -0.1 then
			lastPositions[robot] = nil
		else
			lastPositions[robot] = {pos, World.Time}
		end
	end

	-- evaluate a few positions on the line
	local minTime = Robot.minTimeToBall(robot) + BALL_EXTRA_TIME
	local ballOutTime = Physics.ballOutTime(World.Ball, 0)

	local predictedBallOriginPos,_,_,passReceiver = Goal.predictShot(nil, true)

	if not passReceiver then
		error("InterceptPass is running with no pass to intercept")
	end
	local minTimeToOpp = Physics.ballTravelTime(World.Ball, predictedBallOriginPos:distanceTo(World.Ball.pos))
	local maxTime = math.min(ballOutTime, minTimeToOpp)

	local bestPos
	local bestRating = -math.huge
	local bestRatingOppTime = math.huge
	local posTime
	for i = -1, 10 do
		local useTime
		local futureBallPos
		local rating = 0

		-- reevaluate the previous result
		if i == -1 then
			rating = rating + (lastPositions[robot] and HYST_TIME or 0)
			if lastPositions[robot] then
				futureBallPos = lastPositions[robot][1]
			else
				i = i + 1
			end
		end

		useTime = minTime + i * (maxTime - minTime) / 10
		futureBallPos = futureBallPos or Physics.ballAtTime(World.Ball, useTime).pos

		local evaluation, ownTime, bestOppTime = evaluateInterceptPos(robot, futureBallPos)

		if evaluation >= 0 then
			rating = rating + evaluation --TODO consider endspeed together with the current time advantage
			if rating > bestRating then
				bestRating = rating
				bestPos = futureBallPos
				posTime = ownTime
				bestRatingOppTime = bestOppTime
			end
		end
	end

	if bestPos then
		lastPositions[robot] = {bestPos, World.Time}
	else
		lastPositions[robot] = nil
	end

	return bestPos, posTime, bestRatingOppTime, bestRating
end


InterceptPass.calculateInterceptPos = Cache.forFrame(calculateInterceptPos)

local obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreOpponentRobots = true,
}


function InterceptPass:run()
	local moveDest, time, oppTime = InterceptPass.calculateInterceptPos(self._robot)

	if moveDest == nil then
		local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(
				self._robot.shootRadius + World.Ball.radius)
		moveDest = dribblerPos:nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
		time = Physics.robotTimeToPos(self._robot, moveDest, moveDest:copy():setLength(self._robot.maxSpeed * 0.5))
		local firstEnemy = Ball.firstRobotAtBall(World.OpponentRobots)
		if not firstEnemy then
			oppTime = math.huge
		else
			local nearestPosOnLine = firstEnemy.pos:nearestPosOnLine(
						World.Ball.pos, World.Ball.pos + World.Ball.speed * 3)
			oppTime = Physics.checkedBallTravelTime(World.Ball, nearestPosOnLine)
		end
	end

	local ballTime = Physics.ballTravelTime(World.Ball, World.Ball.pos:distanceTo(moveDest))

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	local dir = (-World.Ball.speed):angle()
	local endSpeed = Physics.robotMinEndspeed(self._robot, moveDest, ballTime)

	if oppTime - time > 0.3 and time < 0.8 then
		self:setMainAttackerParameters(World.Ball.pos, endSpeed:length())
		self._agent._activeBehavior:_applyForMainAttacker()
	end

	self._robot.trajectory:update(ToTarget, moveDest, dir, nil, endSpeed)
end

return InterceptPass
