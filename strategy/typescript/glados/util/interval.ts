export type Interval = [number, number, [any, any]?];

/// Merges a list of intervals
// @param sortedIntervals list (by reference) - the initial intervals ordered by increasing interval start
export function merge (sortedIntervals: Interval[]) {
	let currentInterval = sortedIntervals[0];
	let n = 0;
	for (let i = 1;i<sortedIntervals.length;i++) {
		let interval = sortedIntervals[i];
		if (interval[0] <= currentInterval[1]) {
			// join overlapping intervals
			// ensure that joined interval doesn't shrink
			if (currentInterval[1] < interval[1]) {
				currentInterval[1] = interval[1];
				if (currentInterval[2] != undefined && interval[2] != undefined) {
					currentInterval[2][1] = interval[2][1];
				}
			}
		} else {
			// save interval if not overlapping
			n++;
			sortedIntervals[n] = currentInterval;
			// get next one for merging
			currentInterval = interval;
		}
	}
	// last interval
	n++;
	sortedIntervals[n] = currentInterval;

	sortedIntervals.splice(n, sortedIntervals.length-n);
}

/// Negates a list of intervals
// @param mergedIntervals interval[] - list of intervals as returned by merge
// @param outerStart number - start of the outer limit of the result
// @param outerEnd number - end of the outer limit of the result
export function negate (mergedIntervals: Interval[], outerStart: number, outerEnd: number): Interval[] {
	let chunkStart = outerStart // end of previous sector
	let negated: Interval[] = [];

	for (let i = 0;i<mergedIntervals.length;i++) {
		let interval = mergedIntervals[i];
		if (interval[1] > chunkStart) {
			negated.push([chunkStart, interval[0]]);
		}
		// limit start to outer limits
		chunkStart = Math.max(interval[1], outerStart);
		if (chunkStart > outerEnd) { // stop after reaching the end
			break;
		}
	}

	if (chunkStart < outerEnd) {
		negated.push([chunkStart, outerEnd]);
	}
	return negated;
}

function intervalOrder (t1: Interval, t2: Interval): number {
	return t1[0] - t2[0];
}

/// Sorts the given list of intervals, by increasing interval start
// @param intervals interval[] - list of intervals (by reference)
export function sort (intervals: Interval[]) {
	intervals.sort(intervalOrder);
}

/// Returns the largest interval
// @param intervals interval[] - list of intervals
// @return [interval - largest interval, if one exists]
export function getLargest (intervals: Interval[]): Interval | undefined {
	let largestInterval = undefined;
	let valueLargest = -1 // size of the largest interval
	for (let interval of intervals) { // find the largest interval
		let diff = interval[1] - interval[0]
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
export function getClosestPoint (mergedIntervals: Interval[], Q: number, D: number): number | undefined {
	let biggestSector = undefined;
	let bestMinDist = Infinity;
	for (let sector of mergedIntervals) {
		if (sector[1] - sector[0] >= 2*D) {
			let minDist = Math.min(Math.abs(sector[1] - Q), Math.abs(sector[0] - Q));
			if (biggestSector == undefined || minDist < bestMinDist) {
				biggestSector = sector;
				bestMinDist = minDist;
			}
		}
	}
	if (biggestSector) {
		let spaceRight = Math.abs(Q - biggestSector[1]);
		let spaceLeft = Math.abs(Q - biggestSector[0]);
		if (spaceRight >= D && spaceLeft >= D && (Q>biggestSector[0] && Q<biggestSector[1])) {
			return Q;
		} else if (spaceRight > spaceLeft) {
			return biggestSector[0] + D;
		} else {
			return biggestSector[1] - D;
		}
	} else {
		return undefined;
	}
}

/// Finds the furthest point in an array of intervals with a given distance to its interval boarders
// @param mergedIntervals interval[] - list of intervals as returned by merge
// @param Q number - point to which the distance of the searched point is maximal
// @param D number - minimum distance of the searched point to its nearest boarder.
// This means that it can only lie in an interval with size 2*D or bigger
export function getFurthestPoint (mergedIntervals: Interval[], Q: number, D: number): number | undefined {
	let nearestSector = undefined;
	let bestMaxDist = -Infinity;
	for (let sector of mergedIntervals) {
		if (sector[1] - sector[0] >= 2*D) {
			let maxDist = Math.max(Math.abs(sector[1] - Q), Math.abs(sector[0] - Q));
			if (nearestSector == undefined || maxDist > bestMaxDist) {
				nearestSector = sector;
				bestMaxDist = maxDist;
			}
		}
	}
	if (nearestSector != undefined) {
		let spaceRight = Math.abs(Q - nearestSector[1]);
		let spaceLeft = Math.abs(Q - nearestSector[0]);
		if (spaceRight > spaceLeft) {
			return nearestSector[1] - D;
		} else {
			return nearestSector[0] + D;
		}
	} else {
		return undefined;
	}
}