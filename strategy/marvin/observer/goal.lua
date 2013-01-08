local Goal = {}

local World = require "../base/world"
local Interval = require "util/interval"
local vis = requre "../base/vis"

local function getOccupiedSectors(viewPos, robotList, goalStart, goalEnd) -- fills the list of occupied sectors
	local occupiedSectors = {}
	local extraRadius = World.Ball.radius/2
	for _, robot in pairs(robotList) do
		local robotDiff = robot.pos - viewPos -- vector from viewPos to center of robot
		local robotDiffAngle = math.asin((robot.radius + extraRadius) / robotDiff:length()) -- min angle between robotDiff and shoot sector
		local robotAngle = robotDiff:angle() -- direction of the robot
		local robotStart = robotAngle - robotDiffAngle -- can be < 0
		local robotEnd = robotAngle + robotDiffAngle -- can be > 2pi
		if robotStart < goalEnd and robotEnd > goalStart then -- if the robot covers a part of the goal
			table.insert(occupiedSectors, {math.max(robotStart, goalStart), math.min(robotEnd, goalEnd)}) -- add the occupied sector to the list
		end
	end
	return occupiedSectors
end

--- Returns a list of all free sectors
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
function Goal.freeSectors(viewPos, robotList, opp)
	if (opp and 1 or -1)*viewPos.y > World.FieldHeigthHalf then
		log("viewPos is behind the goal.")
		return nil
	end

	local goalStart = (World.(opp and OpponentGoalRight or FriendlyGoalLeft) - viewPos):angle() -- direction of the first goalpost
	local goalEnd = (World.(opp and OpponentGoalLeft or FriendlyGoalRight) - viewPos):angle() -- direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)
	
	local occupiedSectors = getOccupiedSectors(viewPos, robotList, goalStart, goalEnd)
	table.sort(occupiedSectors, function (t1, t2) return t1[1] < t2[1] end) -- sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors
	local unoccupiedSectors = Interval.negate(occupiedSectors, goalStart, goalEnd)
	local function _visualize()
		vis.setColor(vis.fromRGBA(255, 127, 0, 127), true)
		for _, s in ipairs(unoccupiedSectors) do
			local pointRight = viewPos + Vector.fromAngle(s[1])*10
			local pointLeft = viewPos + Vector.fromAngle(s[2])*10
			vis.addPolygon("Free Sectors", {viewPos, pointRight, point})
		end
	end
	_visualize()
	-- returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors
end

--- Returns the biggest free sector and its width (angle difference)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
function Goal.biggestFreeSector(viewPos, robotList, opp)
	local unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) -- get list of all unoccupied sectors
	local indexBiggest = nil -- index of biggest sector
	local valueBiggest = 0 -- angle difference of the biggest sector
	for i = 1, #unoccupiedSectors do -- find the biggest sector
		local diff = sector[i][2] - sector[i][1]
		if diff > valueBiggest then
			indexBiggest = key
			valueBiggest = diff
		end
	end
	return unoccupiedSectors[indexBiggest], valueBiggest -- returns the biggest sector and its angle difference
end


return Goal
