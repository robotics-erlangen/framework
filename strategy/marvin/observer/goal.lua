local Goal = {}

local World = require "../base/world"
local Interval = require "util/interval"

--- Returns a list of all free sectors
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
function Goal.freeSectors(viewPos, robotList, opp)
	local goalStart = (World.(opp and OpponentGoalRight or FriendlyGoalLeft) - viewPos):angle() -- direction of the first goalpost
	local goalEnd = (World.(opp and OpponentGoalLeft or FriendlyGoalRight) - viewPos):angle() -- direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)
	local occupiedSectors = {} -- list of all occupied sectors {sectorStart, sectorEnd}
	Goal.createListOfOccupiedSectors(viewPos, robotList, goalStart, goalEnd) -- fills the list of occupied sectors
	table.sort(occupiedSectors, function (t1, t2) return t1[1] < t2[1] end) -- sort sectors after increasing sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors
	Interval.negotiate(occupiedSectors, {goalStart, goalEnd}) -- gives all unoccupied sectors in the intervall [right goalpost, left goalpost]
	return occupiedSectors -- returns all UNOCCUPIED sectors (although the variable name is still occupiedSectors)
end

--- Returns the biggest free sector and its width (angle difference)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
function Goal.biggestFreeSector(viewPos, robotList, opp)
	local unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) -- get list of all unoccupied sectors
	local indexBiggest = 1 -- index of biggest sector
	local valueBiggest = unoccupiedSectors[1][2] - unoccupiedSectors[1][1] -- angle difference of the biggest sector
	for key = 2, table.maxn(unoccupiedSectors) do -- find the biggest sector
		local diff = sector[key][2] - sector[key][1]
		if diff > valueBiggest then
			indexBiggest = key
			valueBiggest = diff
		end
	end
	return unoccupiedSectors[indexBiggest], valueBiggest -- returns the biggest sector and its angle difference
end

local function Goal.createListOfOccupiedSectors(viewPos, robotList, goalStart, goalEnd) -- fills the list of occupied sectors
	local halfBallRadius = World.Ball.radius/2
	for _, robot in pairs(robotList) do
		local robotDiff = robot.pos - viewPos -- vector from viewPos to center of robot
		local robotDiffAngle = math.asin(robot.radius + halfBallRadius / robotDiff:length()) -- min angle between robotDiff and shoot sector
		local robotAngle = robotDiff:angle() -- direction of the robot
		local robotStart = robotAngle - robotDiffAngle -- can be < 0
		local robotEnd = robotAngle + robotDiffAngle -- can be > 2pi
		if robotStart < goalEnd and robotEnd > goalStart then -- if the robot covers a part of the goal
			table.insert(occupiedSectors, {math.max(robotStart, goalStart), math.min(robotEnd, goalEnd)}) -- add the occupied sector to the list
		end
	end
end


return Goal