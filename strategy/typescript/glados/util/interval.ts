let Interval = {}


/// Merges a list of intervals
// @param sortedIntervals list (by reference) - the initial intervals ordered by increasing interval start
function Interval.merge (sortedIntervals) {
	let currentInterval = sortedIntervals[1]
	let n = 0
	for (i=2,#sortedIntervals) {
		let interval = sortedIntervals[i]
		if (interval[1] <= currentInterval[2]) {
			// join overlapping intervals
			// ensure that joined interval doesn't shrink
			if (currentInterval[2] < interval[2]) {
				currentInterval[2] = interval[2]
				if (currentInterval[3]) {
					currentInterval[3][2] = interval[3][2]
				}
			}
		} else {
			// save interval if not overlapping
			n = n + 1
			sortedIntervals[n] = currentInterval
			// get next one for merging
			currentInterval = interval
		}
	}
	// last interval
	n = n + 1
	sortedIntervals[n] = currentInterval

	table.truncate(sortedIntervals, n)
}

/// Negates a list of intervals
// @param mergedIntervals interval[] - list of intervals as returned by merge
// @param outerStart number - start of the outer limit of the result
// @param outerEnd number - end of the outer limit of the result
function Interval.negate (mergedIntervals, outerStart, outerEnd) {
	let chunkStart = outerStart // end of previous sector
	let negated = {}

	for (i = 1, #mergedIntervals) {
		let interval = mergedIntervals[i]
		if (interval[1] > chunkStart) {
			table.insert(negated, {chunkStart, interval[1]})
		}
		// limit start to outer limits
		chunkStart = math.max(interval[2], outerStart)
		if (chunkStart > outerEnd) { // stop after reaching the end
			break
		}
	}

	if (chunkStart < outerEnd) {
		table.insert(negated, {chunkStart, outerEnd})
	}
	return negated
}

let intervalOrder = function (t1, t2) {
	return t1[1] < t2[1]
}

/// Sorts the given list of intervals, by increasing interval start
// @param intervals interval[] - list of intervals (by reference)
function Interval.sort (intervals) {
	table.sort(intervals, intervalOrder)
}

/// Returns the largest interval
// @param intervals interval[] - list of intervals
// @return [interval - largest interval, if one exists]
function Interval.getLargest (intervals) {
	let largestInterval = nil
	let valueLargest = -1 // size of the largest interval
	for (_, interval in ipairs(intervals)) { // find the largest interval
		let diff = interval[2] - interval[1]
		if (diff > valueLargest) {
			largestInterval = interval
			valueLargest = diff
		}
	}
	return largestInterval
}

/// Finds the closest point in an array of intervals with a given distance to its interval boarders
// @param mergedIntervals interval[] - list of intervals as returned by merge
// @param Q number - point to which the distance of the searched point is minimal
// @param D number - minimum distance of the searched point to its nearest boarder.
// This means that it can only lie in an interval with size 2*D or bigger
function Interval.getClosestPoint (mergedIntervals, Q, D) {
	let biggestSector = nil
	let bestMinDist = nil
	for (_, sector in ipairs(mergedIntervals)) {
		if (sector[2] - sector[1] >= 2*D) {
			let minDist = math.min(math.abs(sector[2] - Q), math.abs(sector[1] - Q))
			if (not biggestSector  ||  minDist < bestMinDist) {
				biggestSector = sector
				bestMinDist = minDist
			}
		}
	}
	if (biggestSector) {
		let spaceRight = math.abs(Q - biggestSector[2])
		let spaceLeft = math.abs(Q - biggestSector[1])
		if (spaceRight >= D  &&  spaceLeft >= D  &&  (Q>biggestSector[1]  &&  Q<biggestSector[2])then
			return Q
		elseif spaceRight > spaceLeft) {
			return biggestSector[1] + D
		} else {
			return biggestSector[2] - D
		}
	} else {
		return nil
	}
}

/// Finds the furthest point in an array of intervals with a given distance to its interval boarders
// @param mergedIntervals interval[] - list of intervals as returned by merge
// @param Q number - point to which the distance of the searched point is maximal
// @param D number - minimum distance of the searched point to its nearest boarder.
// This means that it can only lie in an interval with size 2*D or bigger
function Interval.getFurthestPoint (mergedIntervals, Q, D) {
	let nearestSector = nil
	let bestMaxDist = nil
	for (_, sector in ipairs(mergedIntervals)) {
		if (sector[2] - sector[1] >= 2*D) {
			let maxDist = math.max(math.abs(sector[2] - Q), math.abs(sector[1] - Q))
			if (not nearestSector  ||  maxDist > bestMaxDist) {
				nearestSector = sector
				bestMaxDist = maxDist
			}
		}
	}
	if (nearestSector) {
		let spaceRight = math.abs(Q - nearestSector[2])
		let spaceLeft = math.abs(Q - nearestSector[1])
		if (spaceRight > spaceLeft) {
			return nearestSector[2] - D
		} else {
			return nearestSector[1] + D
		}
	} else {
		return nil
	}
}

return Interval
