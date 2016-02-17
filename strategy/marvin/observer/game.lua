local Game = {}

local Field = require "../base/field"
local World = require "../base/world"
local Ball = require "observer/ball"
local Robotlist = require "util/robotlist"


local G = World.Geometry

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
	for _,robot in ipairs(World.OpponentRobots) do
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
		if robot ~= World.OpponentKeeper then
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
