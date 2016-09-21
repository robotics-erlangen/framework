local Interval = {}


--- Merges a list of intervals
-- @param sortedIntervals list (by reference) - the initial intervals ordered by increasing interval start
function Interval.merge(sortedIntervals)
	local currentInterval = sortedIntervals[1]
	local n = 0
	for i=2,#sortedIntervals do
		local interval = sortedIntervals[i]
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
	for _, interval in ipairs(intervals) do -- find the largest interval
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
	local biggestSector = nil
	local bestMinDist = nil
	for _, sector in ipairs(mergedIntervals) do
		if sector[2] - sector[1] >= 2*D then
			local minDist = math.min(math.abs(sector[2] - Q), math.abs(sector[1] - Q))
			if not biggestSector or minDist < bestMinDist then
				biggestSector = sector
				bestMinDist = minDist
			end
		end
	end
	if biggestSector then
		local spaceRight = math.abs(Q - biggestSector[2])
		local spaceLeft = math.abs(Q - biggestSector[1])
		if spaceRight >= D and spaceLeft >= D and (Q>biggestSector[1] and Q<biggestSector[2])then
			return Q
		elseif spaceRight > spaceLeft then
			return biggestSector[1] + D
		else
			return biggestSector[2] - D
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
	local nearestSector = nil
	local bestMaxDist = nil
	for _, sector in ipairs(mergedIntervals) do
		if sector[2] - sector[1] >= 2*D then
			local maxDist = math.max(math.abs(sector[2] - Q), math.abs(sector[1] - Q))
			if not nearestSector or maxDist > bestMaxDist then
				nearestSector = sector
				bestMaxDist = maxDist
			end
		end
	end
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
