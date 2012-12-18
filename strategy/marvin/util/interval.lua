local Interval = {}

local table = reqire "../base/table"

--- Merges a list of intervals
-- @param listOfSortedIntervals list (by reference) - the initial intervals ordered after increasing interval start
function Interval.merge(listOfSortedIntervals)
	--local mergedIntervals = {}
	local currentInterval = nil
	local n = 0
	for _, interval in ipairs(listOfSortedIntervals)
		if currentInterval then
			if interval[1] <= currentInterval[2] then
				currentInterval[2] = interval[2]
			else
				n = n + 1
				listOfSortedIntervals[n] = currentInterval
				--table.insert(mergedIntervals, currentInterval)
				currentInterval = interval
			end
		else
			currentInterval = interval
		end
	end
	n = n + 1
	listOfSortedIntervals[n] = currentInterval
	table.truncate(listOfSortedIntervals, n)
	--table.insert(mergedIntervals, currentInterval)
	--return mergedIntervals
end

--- Negotiates a list of intervals
-- @param listOfSortedNonOverlappingIntervals list (by reference) - the initial nonoverlapping intervals sorted after increasing interval start
-- @param outerLimits list - interval marking the outer limits of the result (all intervals in listOfSortedNonOverlappingIntervals must be inside outerLimits)
function Interval.negotiate(listOfSortedNonOverlappingIntervals, outerLimits)
	local memory1 = nil
	local memory2 = nil
	if listOfSortedNonOverlappingIntervals[1][1] > outerLimits[1] then
		memory1 = {outerLimits[1], listOfSortedNonOverlappingIntervals[1][1]}
	end
	maxn = table.maxn(listOfSortedNonOverlappingIntervals)
	for key = 1, maxn - 1 do
		if memory1 then
			memory2 = {listOfSortedNonOverlappingIntervals[key][2], listOfSortedNonOverlappingIntervals[key+1][1]}
			listOfSortedNonOverlappingIntervals[key] = memory1
			memory1 = memory2
		else
			listOfSortedNonOverlappingIntervals[key] = {listOfSortedNonOverlappingIntervals[key][2], listOfSortedNonOverlappingIntervals[key+1][1]}
		end
	end
	if listOfSortedNonOverlappingIntervals[maxn][2] < outerLimits[2] then
		if memory1 then
			memory2 = {listOfSortedNonOverlappingIntervals[maxn][2], outerLimits[2]}
			listOfSortedNonOverlappingIntervals[maxn] = memory1
			table.insert(listOfSortedNonOverlappingIntervals, memory2)
		else
			listOfSortedNonOverlappingIntervals[maxn] = {listOfSortedNonOverlappingIntervals[maxn][2], outerLimits[2]}
		end
	end
end


return Interval