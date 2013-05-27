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

return Interval
