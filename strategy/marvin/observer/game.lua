local Game = {}

-- TODO: use caching
-- TODO: check for unexpected changes


local World = require "../base/world"
local G = World.Geometry
local Robotlist = require "util/robotlist"
local Field = require "../base/field"
local Ball = require "observer/ball"

local function weight(robot)
	if not robot.isFriendly then
		local distanceWeight = 1 -- [0, 1] how important the distance to our goal is, used for avgPos
		return math.max(2 - robot.pos:distanceTo(G.FriendlyGoal) / G.FieldHeightHalf, 0) * distanceWeight
	else
		return -0.5; --TODO find better weight calculation for 'friendly' case
	end
end

function Game.gameFocus()
	-- magic constants
	local gugugu = 0.5 --the time, how long the ball rolling is calculated
	local ballPosWeight = 0.3 -- [0, 1] how much the future ball pos is involved

	-- calculation stuff
	local robots = Robotlist.excludeRobot(World.Robots, World.OpponentKeeper)
	robots = Robotlist.excludeRobot(robots, World.FriendlyKeeper)
	local avgPos = Game.averagePosition(robots, weight, weight)

	local futureBallPos = Ball.atTime(gugugu).pos
	local focusPoint = futureBallPos:scaleLength(ballPosWeight) + avgPos:scaleLength(1 - ballPosWeight)
	return focusPoint
end


--- calculates the average position of all robots in the given list
-- @param robots Robot[] - a list of robots
-- @param weightX function - optional parameter, returns the weighting (non-negative) of the robot in x direction,
-- expects a robot object
-- @param weightY function - same as with weightx, just in x direction
-- @return Vector - the average position
function Game.averagePosition(robots, weightX, weightY)
	if not robots or not #robots then
		return nil
	end
	local sumX, sumY = 0, 0
	for _,r in pairs(robots) do
		local weightFactorX = 1
		local weightFactorY = 1
		if weightX then
			weightFactorX = weightX(r)
		end
		if weightY then
			weightFactorY = weightY(r)
		end
		sumX = sumX + r.pos.x * weightFactorX
		sumY = sumY + r.pos.y * weightFactorY
	end
	return Field.limitToField(Vector(sumX/#robots, sumY/#robots), 0)
end

--- divides the field into 3 sectors (1 left, 2 center, 3 right)
-- @param ignoreCorners bool - if robots which are somewhat away from the center are ignored
-- @return Robot[], Robot[], Robot[] - 3 lists of robots representing the sectors
function Game.divideOpponentsIntoSectors(ignoreCorners)
	 -- _________________________ <- opponent's goal line
	 -- |       |       |       |
	 -- |       |       |       |
	 -- |_______|   2   |_______| <- border: field height quarter
	 -- |       |       |       |
	 -- |   1   |       |   3   |
	 -- |_______|_______|_______| <- center line
	 -- |                       |
	local sector = {{}, {}, {}}
	local border = G.CenterCircleRadius + G.FieldWidthQuarter
	for _,robot in pairs(World.OpponentRobots) do
		local sectorNumber = Game.getSector(robot, ignoreCorners)
		if sectorNumber then
			table.insert(sector[sectorNumber], robot)
		end
	end
	return sector[1], sector[2], sector[3]
end

--- returns the sector number where the robot stands
-- @param robot Robot - the robot
-- @param ignoreCorners  bool - if the robot must be somewhat near the center
-- @return number - 1, 2 or 3, depending on the sector, or nil, if ignoreCorners is set and the robot is ignored
function Game.getSector(robot, ignoreCorners)
	local border = G.FieldHeightQuarter
	if robot.pos.y < border or not ignoreCorners then
		if robot.pos.x < -G.CenterCircleRadius - robot.radius then
			return 1
		elseif robot.pos.x > G.CenterCircleRadius + robot.radius then
			return 3
		end
	end
	if robot.pos.x >= -G.CenterCircleRadius - robot.radius
	and robot.pos.x <= G.CenterCircleRadius + robot.radius then
		return 2
	end
	return nil
end

--- returns "left" or "right"
function Game.attackSideWithLessOpponents()
	local rightOpponents = 0
	local rightOppsPosSum = 0
	local leftOpponents = 0
	local leftOppsPosSum = 0
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y > 0 then
			if robot.pos.x > 0 then
				rightOpponents = rightOpponents + 1
				rightOppsPosSum = rightOppsPosSum + robot.pos.x
			else
				leftOpponents = leftOpponents + 1
				leftOppsPosSum = leftOppsPosSum - robot.pos.x
			end
		end
	end
	local side = "left"
	if rightOpponents < leftOpponents then
		side = "right"
	elseif rightOpponents == leftOpponents then
		side = (rightOppsPosSum < leftOppsPosSum) and "right" or "left"
	end
	return side
end


return Game
