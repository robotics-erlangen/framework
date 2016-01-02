local Interval = {}


--- Merges a list of intervals
-- @param sortedIntervals list (by reference) - the initial intervals ordered by increasing interval start
function Interval.merge(sortedIntervals)
	local currentInterval = nil
	local n = 0
	for _, interval in ipairs(sortedIntervals) do
		if currentInterval then
			if interval[1] <= currentInterval[2] then
				-- join overlapping intervals
				-- ensure that joined interval doesn't shrink
				if currentInterval[2] < interval[2] then
					currentInterval[2] = interval[2]
				end
			else
				-- save interval if not overlapping
				n = n + 1
				sortedIntervals[n] = currentInterval
				-- get next one for merging
				currentInterval = interval
			end
		else
			currentInterval = interval
		end
	end
	-- last interval
	n = n + 1
	sortedIntervals[n] = currentInterval

	table.truncate(sortedIntervals, n)
end

--- Negates a list of intervals
-- @param mergedIntervals interval[] - list of intervals as returned by merge
-- @param outerStart number - start of the outer limit of the result
-- @param outerEnd number - end of the outer limit of the result
function Interval.negate(mergedIntervals, outerStart, outerEnd)
	local chunkStart = outerStart -- end of previous sector
	local negated = {}

	for i = 1, #mergedIntervals do
		local interval = mergedIntervals[i]
		if interval[1] > chunkStart then
			table.insert(negated, {chunkStart, interval[1]})
		end
		-- limit start to outer limits
		chunkStart = math.max(interval[2], outerStart)
		if chunkStart > outerEnd then -- stop after reaching the end
			break
		end
	end

	if chunkStart < outerEnd then
		table.insert(negated, {chunkStart, outerEnd})
	end
	return negated
end

local function intervalOrder(t1, t2)
	return t1[1] < t2[1]
end

--- Sorts the given list of intervals, by increasing interval start
-- @param intervals interval[] - list of intervals (by reference)
function Interval.sort(intervals)
	table.sort(intervals, intervalOrder)
end

--- Returns the largest interval
-- @param intervals interval[] - list of intervals
-- @return [interval - largest interval, if one exists]
function Interval.getLargest(intervals)
	local largestInterval = nil
	local valueLargest = -1 -- size of the largest interval
	for _, interval in ipairs(intervals) do	-- find the largest interval
		local diff = interval[2] - interval[1]
		if diff > valueLargest then
			largestInterval = interval
			valueLargest = diff
		end
	end
	return largestInterval
end


function table.max(t)
	local max = t[1]
	for _,v in ipairs(t) do
		if v > max then
			max = v
		end
	end
	return max
end

--- Finds the closest point in an array of intervals with a given distance to its interval boarders
-- @param mergedIntervals interval[] - list of intervals as returned by merge
-- @param Q number - point to which the distance of the searched point is minimal
-- @param D number - minimum distance of the searched point to its nearest boarder.
-- This means that it can only lie in an interval with size 2*D or bigger
function Interval.getClosestPoint(mergedIntervals, Q, D)
	local bigEnoughSectors = table.filter(mergedIntervals, function(s) return s[2]-s[1] >= 2*D end)
	local function cmpBoarderDist(sector1, sector2)
		local minDist1 = math.min(math.abs(sector1[2] - Q), math.abs(sector1[1] - Q))
		local minDist2 = math.min(math.abs(sector2[2] - Q), math.abs(sector2[1] - Q))
		return minDist1 < minDist2
	end
	table.sort(bigEnoughSectors, cmpBoarderDist)
	local nearestSector = bigEnoughSectors[1]
	if nearestSector then
		local spaceRight = math.abs(Q - nearestSector[2])
		local spaceLeft = math.abs(Q - nearestSector[1])
		if spaceRight >= D and spaceLeft >= D and (Q>nearestSector[1] and Q<nearestSector[2])then
			return Q
		elseif spaceRight > spaceLeft then
			return nearestSector[1] + D
		else
			return nearestSector[2] - D
		end
	else
		return nil
	end
end

--- Finds the furthest point in an array of intervals with a given distance to its interval boarders
-- @param mergedIntervals interval[] - list of intervals as returned by merge
-- @param Q number - point to which the distance of the searched point is maximal
-- @param D number - minimum distance of the searched point to its nearest boarder.
-- This means that it can only lie in an interval with size 2*D or bigger
function Interval.getFurthestPoint(mergedIntervals, Q, D)
	local bigEnoughSectors = table.filter(mergedIntervals, function(s) return s[2]-s[1] >= 2*D end)
	local function cmpBoarderDist(sector1, sector2)
		local maxDist1 = math.max(math.abs(sector1[2] - Q), math.abs(sector1[1] - Q))
		local maxDist2 = math.max(math.abs(sector2[2] - Q), math.abs(sector2[1] - Q))
		return maxDist1 > maxDist2
	end
	table.sort(bigEnoughSectors, cmpBoarderDist)
	local nearestSector = bigEnoughSectors[1]
	if nearestSector then
		local spaceRight = math.abs(Q - nearestSector[2])
		local spaceLeft = math.abs(Q - nearestSector[1])
		if spaceRight > spaceLeft then
			return nearestSector[2] - D
		else
			return nearestSector[1] + D
		end
	else
		return nil
	end
end

return Interval
