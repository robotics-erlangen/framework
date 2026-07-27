--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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

local Goal = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Volley = require "task/ability/volley"
local Interval = require "util/interval"
local Rating = require "util/rating"


local G = World.Geometry

--- returns a list of all non-free sectors
-- the non-free sectors are not merged and not sorted
-- the interval has to be oriented counter-clockwise
-- @param viewPos vector - usually Ball.pos
-- @param robotList list - all robots that may block the sight
-- @param startAngle number - start angle of the sector to scan
-- @param endAngle number - end angle of the sector to scan
-- @param insertRobots - set to true iff you want the robots included in its sector
-- @return occupiedSectors list - all unsorted, unmerged occupied sectors
function Goal.getOccupiedSectors(viewPos, robotList, startAngle, endAngle, insertRobots)
	if endAngle < startAngle then -- normalize angles
		endAngle = endAngle + 2 * math.pi
	end

	local occupiedSectors = {}
	local extraRadius = World.Ball.radius
	for _, robot in pairs(robotList) do
		local toRobot = robot.pos - viewPos -- vector from viewPos to center of robot
		local robotAngleDiff
		if robot.radius + extraRadius <= toRobot:length() then
			robotAngleDiff = math.asin((robot.radius + extraRadius) / toRobot:length()) -- min angle between toRobot and shoot sector
		else
			robotAngleDiff = math.pi/2 -- 90 deg, if the ball touches the robot (asin[-1,1]!)
		end
		local robotAngle = toRobot:angle() -- direction of the robot
		local robotStart = robotAngle - robotAngleDiff -- can be < 0
		local robotEnd = robotAngle + robotAngleDiff -- can be > 2pi
		if robotStart < endAngle and robotEnd > startAngle then -- if the robot covers a part of the goal
			local resultTable = {math.max(robotStart, startAngle), math.min(robotEnd, endAngle)}
			if insertRobots then
				resultTable[3] = {robot, robot}
			end
			table.insert(occupiedSectors, resultTable) -- add the occupied sector to the list
		end
		if robotStart + 2 * math.pi < endAngle then -- normalize angles
			-- checking for robotEnd + 2*pi > startAngle is not needed, as robotEnd is always >= 0 and startAngle < 2pi
			-- and thus is always true
			robotStart = robotStart + 2 * math.pi
			robotEnd = robotEnd + 2 * math.pi
			local resultTable = {math.max(robotStart, startAngle), math.min(robotEnd, endAngle)}
			if insertRobots then
				resultTable[3] = {robot, robot}
			end
			table.insert(occupiedSectors, resultTable) -- add the occupied sector to the list
		end
	end
	return occupiedSectors
end

function Goal.getFreeSectors(viewPos, robotList, startAngle, endAngle)
	if endAngle < startAngle then -- normalize angles
		endAngle = endAngle + 2 * math.pi
	end
	local occupiedSectors = Goal.getOccupiedSectors(viewPos, robotList, startAngle, endAngle)
	Interval.sort(occupiedSectors) -- sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors
	return Interval.negate(occupiedSectors, startAngle, endAngle)
end

--- Returns a list of all free sectors
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return list - list of free sectors [startAngle, endAngle] ascending by start angle
function Goal.freeSectors(viewPos, robotList, opp)
	if (opp and 1 or -1)*viewPos.y > G.FieldHeightHalf then
		--log("viewPos is behind the goal.")
		return {}
	end

	local goalStart = ((opp and G.OpponentGoalRight or G.FriendlyGoalLeft) - viewPos):angle() -- direction of the first goalpost
	local goalEnd = ((opp and G.OpponentGoalLeft or G.FriendlyGoalRight) - viewPos):angle() -- direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)

	local unoccupiedSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd)
	--log(tostring(goalEnd - goalStart))
	-- returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors
end

--- Returns the largest free sector and its width (angle difference)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return largestFreeSector interval - the largest free sector
function Goal.largestFreeSector(viewPos, robotList, opp)
	local unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) -- get list of all unoccupied sectors
	return Interval.getLargest(unoccupiedSectors)
end

--- Returns a list of all sectors not covered by any robot from robotList (not limited to the goal)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
function Goal.allFreeSectors(viewPos, robotList)
	local occupiedSectors = Goal.getOccupiedSectors(viewPos, robotList, 0, 2*math.pi)
	--for i,sector in ipairs(occupiedSectors) do
	--	debug.set("osectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	--end
	local matching = nil
	local delete = {}
	for i,sector in ipairs(occupiedSectors) do
		if sector[1] == 0 then
			if matching then
				occupiedSectors[matching] = {occupiedSectors[matching][1], sector[2] + 2*math.pi}
				--debug.set("match "..matching.." & "..i, "{"..occupiedSectors[matching][1]..", "..occupiedSectors[matching][2].."}")
				matching = nil
				table.insert(delete, i)
			else
				matching = i
				--debug.set("match "..i, "start")
				--log("start")
			end
		elseif sector[2] == 2*math.pi then
			if matching then
				occupiedSectors[matching] = {sector[1], occupiedSectors[matching][2] + 2*math.pi}
				--debug.set("match "..matching.." & "..i, "{"..occupiedSectors[matching][1]..", "..occupiedSectors[matching][2].."}")
				matching = nil
				table.insert(delete, i)
			else
				matching = i
				--debug.set("match "..i, "end")
				--log("end")
			end
		end
	end
	for i = #delete,1,-1 do
		table.remove(occupiedSectors, delete[i])
	end
	Interval.sort(occupiedSectors)
	--for i,sector in ipairs(occupiedSectors) do
	--	debug.set("O2sectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	--end
	Interval.merge(occupiedSectors)
	--for i,sector in ipairs(occupiedSectors) do
	--	debug.set("MOsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	--end
	local freeSectors = Interval.negate(occupiedSectors, -42, 1337) -- magic constants, don't change!
	if #freeSectors > 2 then
		local first = freeSectors[1]
		local last = freeSectors[#freeSectors]
		--log(#freeSectors)
		--for i,sector in ipairs(freeSectors) do
		--	debug.set("Fsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
		--end
		freeSectors[1] = {last[1], first[2]}
		table.remove(freeSectors)
	elseif #freeSectors > 1 then -- exactly 2 halfs (that are actually 1 sector, but with a sign flip)
		local first = freeSectors[1]
		local second = freeSectors[2]
		freeSectors = {{second[1], first[2]}}
		--for i,sector in ipairs(freeSectors) do
		--	debug.set("Fsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
		--end
	else -- no free sector
		freeSectors = {}
	end
	-- remove sectors that are broader than 2pi
	for i = #freeSectors,1,-1 do
		if math.abs(freeSectors[i][2] - freeSectors[i][1]) > 2*math.pi then
			table.remove(freeSectors, i)
		end
	end
	return freeSectors
end

local oldRobotPositions = {} -- robot -> position
local lastRawdataBallPos = World.Ball.pos
local function updateRobotPositions()
	if World.Ball.hasRawData then
		lastRawdataBallPos = World.Ball.pos
		for _, robot in ipairs(World.OpponentRobots) do
			oldRobotPositions[robot] = robot.pos
		end
	end
end

local function getInvisibleBallPrediction()
	-- basically invisible ball
	if World.Ball.detectionQuality < 0.05 then
		-- get the last tracked ball state

		-- check if it is close to the defense area
		local MAX_DEFENSE_DIST = 2.5
		if Field.distanceToFriendlyDefenseArea(lastRawdataBallPos, 0) > MAX_DEFENSE_DIST and
			Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0) > MAX_DEFENSE_DIST then
			return
		end

		-- TODO: check for fast ball and save predictShot
		--if not Ball.isSlowBall() then
		--end

		-- search for robots that were close at that point in time
		local closestRobot = nil
		local closestDistance = 0.5 -- no robots farther away from the ball than that
		local closestDribblerPos, closestBallSpeed
		for _, robot in ipairs(World.OpponentRobots) do
			if not oldRobotPositions[robot] then
				break
			end
			local oldDistance = oldRobotPositions[robot]:distanceTo(lastRawdataBallPos)
			local newDistance = robot.pos:distanceTo(lastRawdataBallPos)
			if oldDistance < closestDistance or newDistance < closestDistance then
				-- it has to roughly point at the goal
				local robotDir = Vector.fromAngle(robot.dir)
				-- as the robot might be dribbling the ball, use volley prediction
				-- TODO: check if that is really a good idea! When using a relative speed of 0, volley calculations are useless.
				-- This can be different in the future.
				-- FIXME: volley for moving robots does not consider the friction of the carpet, because it is calculating everything
				-- in robot coordinates
				-- robot.speed as param for ballspeed is choosen, because that is the best estimate if there is no visible ball
				local dirx, diry = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, robot.speed, robot.dir, robot.speed, "opp")
				local ballSpeed = Vector(dirx, diry)
				local dribblerPos = robot.pos + robotDir:copy():setLength(robot.shootRadius)
				local intersection = geom.intersectLineLine(G.FriendlyGoal, Vector(1, 0),
					dribblerPos, ballSpeed)
				if intersection and math.abs(intersection.x) < G.GoalWidth / 2 + 0.3 then
					closestDistance = math.min(oldDistance, newDistance)
					closestRobot = robot
					closestDribblerPos = dribblerPos
					closestBallSpeed = ballSpeed
				end
			end
		end

		if not closestRobot then
			return
		end
		return closestDribblerPos, closestBallSpeed, closestRobot
	end
end

--- Predicts the direction the ball will be shot into.
-- Checks for ball movement, opponents near the ball, tries to predict passes
-- @param allShots bool - whether or not to only count shots that can volley onto the goal and might hit the goal
-- @return pos Vector - origin of movement
-- @return dir Vector - ball movement direction and speed
-- @return isShot bool - if the ball is fast (and should be considered as a threat)
-- @return passReceivers list - list of all robots that could receive the pass
local BEST_ROBOT_HYSTERESIS = 1.1
local lastBestRobotId = nil
local function comparePrediction(p1, p2)
	if p1.dist == p2.dist then
		return p1.ballTime < p2.ballTime
	end
	return p1.dist > p2.dist
end

function Goal.predictShot(allShots, excludeInvisible)
	-- check for bad vision
	if not excludeInvisible then

		local invisibleBallPos, invisibleBallSpeed, oppRobot = getInvisibleBallPrediction()
		if invisibleBallPos then
			vis.addCircle("o/goal: predictShot: invisible ball", oppRobot.pos, oppRobot.radius, vis.colors.white, false)
				vis.addPath("o/goal: predictShot: invisible ball", {oppRobot.pos, oppRobot.pos + invisibleBallSpeed * 10}, vis.colors.white)
			return invisibleBallPos, invisibleBallSpeed, true, nil, true
		end

	end

	local ballSpeed = World.Ball.speed:copy() -- Defend ball by default
	local pos = World.Ball.pos
	local isShot = false
	local isDribbling = false
	local passReceivers = {}

	local oppBallOwner = Ball.opponentBallOwner()
	local oppBallDribbler = Ball.opponentBallDribbler()
	if oppBallDribbler then
		isShot = true
		isDribbling = true
		--NOTE: use World.Ball instead of futureBall is fine, as the shot is assumed to be imminent.
		local dirx, diry = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, World.Ball.speed, oppBallDribbler.dir, oppBallDribbler.speed, "opp")
		ballSpeed = Vector(dirx, diry):normalize()
		if not allShots then
			vis.addCircle("o/goal: predictShot: dribbling robot", oppBallDribbler.pos, oppBallDribbler.radius, vis.colors.blue, false)
			vis.addPath("o/goal: predictShot: dribbling robot", {oppBallDribbler.pos, oppBallDribbler.pos + ballSpeed * 10}, vis.colors.blue)
		end
	elseif oppBallOwner and Ball.isSlowBall() then
		-- if opponent is close to ball use its orientation
		ballSpeed = Vector.fromAngle(oppBallOwner.dir)
		isDribbling = true
	elseif not Ball.isSlowBall() then
		-- FIXME as the ball is moving also use pass check if it slightly misses the goal
		-- TODO check whether an opponent robot may deflect the ball inside the keeper area?
		-- check if there's a robot which may recieve the pass

		-- calculate the last point at which a volley with 75 degree angle is still possible
		local usedGoalPost = World.Geometry.FriendlyGoalLeft
		if World.Ball.speed.x < 0 then
			usedGoalPost = World.Geometry.FriendlyGoalRight
		end
		local ballLineDistance = math.abs(usedGoalPost:orthogonalDistance(pos, pos + ballSpeed))
		local ballLinePos = usedGoalPost:orthogonalProjection(pos, pos + ballSpeed)
		local volleyPosDistance = ballLineDistance / math.tan(math.pi * 75 / 180)
		local ballSpeedCopy = ballSpeed:copy()
		local volleyPos = ballLinePos + ballSpeedCopy:setLength(volleyPosDistance)
		if not allShots then
			vis.addCircle("o/goal: predictShot: last volley pos", volleyPos, 0.1)
		end

		if allShots or Field.isInField(volleyPos, 0) then -- if a volley is possible
			local lengthOfBallMovement = 0.5 * ballSpeed:lengthSq() / (-Constants.ballDeceleration)
			local lineSegments = Field.allowedLineSegments(pos, ballSpeed, lengthOfBallMovement)
			if not allShots then
				for _, line in ipairs(lineSegments) do
					vis.addPath("o/goal: predictShot: allowed catch path", {line[1], line[2]}, vis.colors.cyan)
				end
			end

			for _, robot in ipairs(World.OpponentRobots) do
				local bestPointOnLine = World.Ball.pos
				local bestPointDistance = math.huge
				for _, lineSegment in ipairs(lineSegments) do
					local pointOnLine = robot.pos:nearestPosOnLine(lineSegment[1], lineSegment[2])
					local distance = robot.pos:distanceTo(pointOnLine)
					if distance < bestPointDistance then
						bestPointDistance = distance
						bestPointOnLine = pointOnLine
					end
				end
				if not allShots and math.sin(robot.dir) > 0 then
					goto continue
				end
				local ballRollTime = Physics.checkedBallRollTime(World.Ball, bestPointOnLine)
				local offsetLength = math.min(robot.shootRadius + World.Ball.radius, robot.pos:distanceTo(bestPointOnLine))
				local catchPos = bestPointOnLine + (robot.pos - bestPointOnLine):setLength(offsetLength)

				-- calculate chance of the robot reaching catchPos before the ball
				local weightedDistance
				if math.abs(ballRollTime) == math.huge then
					weightedDistance = 0
				elseif robot.pos:distanceTo(catchPos) < 0.1 then
					weightedDistance = 100000000 -- very large number smaller than math.huge
				else
					local robotTime = Physics.robotTimeToPos(robot, catchPos, Vector(robot.maxSpeed, 0))
					weightedDistance = Rating.valueToRating(robotTime, ballRollTime, 0) * 1 / pos:distanceTo(catchPos)
				end
				if robot.id == lastBestRobotId and weightedDistance > 0 then
					weightedDistance = weightedDistance * BEST_ROBOT_HYSTERESIS
				end
				if (robot.pos:distanceTo(World.Ball.pos)) < robot.shootRadius then
					weightedDistance = math.huge
				end

				if weightedDistance > 0 then
					table.insert(passReceivers, {robot = robot, dist = weightedDistance, ballTime = ballRollTime,
						catchPos = catchPos})
					if not allShots then
						vis.addPath("o/goal: predictShot: to catch position", {robot.pos, catchPos}, vis.colors.red)
					end
				end
::continue::
			end
			table.sort(passReceivers, comparePrediction)

			if #passReceivers > 0 then -- if there is a pass receiver, just block it
				local passReceiver = passReceivers[1]
				lastBestRobotId = passReceiver.id
				pos = passReceiver.catchPos
				local ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(pos))
				-- assume that the opponent will try to stop for the volley and brake from now
				-- TODO: Don't use 4 m/s*s as constant, at least not hidden like this
				local oppBrakeSpeed = math.max(0, passReceiver.robot.speed:length() - 4 * ballRollTime)
				local minRobotSpeed = passReceiver.robot.speed:copy():setLength(oppBrakeSpeed)
				local futureBallSpeed = Physics.ballAtTime(World.Ball, ballRollTime).speed
				-- TODO: Check what happens if futureBallSpeed:length() is zero
				local robotAngle = passReceiver.robot.dir
				local dirx, diry = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, futureBallSpeed, robotAngle,
					minRobotSpeed, "opp")
				ballSpeed = Vector(dirx, diry):normalize()
				if not allShots then
					vis.addPath("o/goal: predictShot: receives pass", {passReceiver.robot.pos, pos}, vis.colors.pink)
					vis.addCircle("o/goal: predictShot: receives pass", pos, passReceiver.robot.radius, vis.colors.pink, false)
					vis.addPath("o/goal: predictShot: receives pass", {pos, pos + ballSpeed * 10}, vis.colors.pink)
				end
			end
		end
		isShot = true
	else
		-- otherwise use center of directions to goal posts
		-- FIXME: check
		local left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos):normalize()
		local right = (World.Geometry.FriendlyGoalRight - World.Ball.pos):normalize()
		ballSpeed = left + right
	end

	return pos, ballSpeed, isShot, passReceivers, isDribbling
end
Goal.predictShot = Cache.forFrame(Goal.predictShot)

function Goal._update()
	updateRobotPositions()
end


return Goal
