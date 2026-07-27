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

local MovesHelper = {}

local geom = require "../base/geom"
local vis = require "../base/vis"

-- this function draws the two circles, in which a volley pass is not possible
-- it also returns the values from the indiscribed angle theorem
-- this MUST be considered in every static freekick
function MovesHelper.volleyCircle(point1, point2, theta)
	local center1, center2, radius = geom.inscribedAngle(point1, point2, theta)
	vis.addCircle("volleyCycle", center1, radius, vis.colors.redHalf, true)
	vis.addCircle("volleyCycle", center2, radius, vis.colors.redHalf, true)
	return center1, center2, radius
end

local function createOptionsTableRec(options)
	local lastTable = {{}}
	if options > 1 then
		lastTable = createOptionsTableRec(options - 1)
	end
	local resultTable = {}
	for _, part  in ipairs(lastTable) do
		for i = 1,options do
			local partCopy = table.copy(part)
			table.insert(partCopy, i, options)
			table.insert(resultTable, partCopy)
		end
	end
	return resultTable
end

-- this function performs a least squares optimization of the distance
-- between each robot and the assigned position
-- as it uses brute force, it should not be called with more than 4 positions
-- @param robots table - list of robots to assign. the first ignoreFirstNRobots are assigned to their index
-- @param positions table - list of positions to assign the remaining robots to
-- @param ignoreFirstNRobots number - ignore the first n robots in robots during assignment
-- @return table - assignments. use like this: robots[assignment[i]] -> assign to positions[i]
function MovesHelper.assignRobots(robots, positions, ignoreFirstNRobots)
	if #robots - ignoreFirstNRobots ~= #positions then
		log("Moveshelper: unmatching number of robots and positions!")
		return
	end
	local assignment = {}
	for i = 1, ignoreFirstNRobots do
		table.insert(assignment, i)
	end

	local options = createOptionsTableRec(#positions)
	local bestOptionIndex
	local bestOptionScore = math.huge
	for i, option in ipairs(options) do
		local totalDistance = 0
		for b, id in ipairs(option) do
			totalDistance = totalDistance + robots[ignoreFirstNRobots + id].pos:distanceToSq(positions[b])
		end
		if totalDistance < bestOptionScore then
			bestOptionScore = totalDistance
			bestOptionIndex = i
		end
	end

	for _, index in ipairs(options[bestOptionIndex]) do
		table.insert(assignment, index + ignoreFirstNRobots)
	end

	return assignment
end

return MovesHelper
