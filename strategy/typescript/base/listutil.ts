/**
 * @module listutil
 * Extensions to javascript array functions
 */

/**************************************************************************
*   Copyright 2018 Paul Bergmann, Christoph Schmidtmeier                  *
*   Robotics Erlangen e.V.                                                *
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
**************************************************************************/

/**
 * Finds the minimum of a list using the given rating function.
 * Calls rate exactly list.length times
 * @param list - the array to search
 * @param rate - a function calculating a rating for a given list entry
 * @returns the minimum of the list
 */
export function min<T>(list: T[], rate: (a: T) => number): [T | undefined, number] {
	let currentMin: T | undefined = undefined;
	let minRating = Infinity;
	for (const i of list) {
		const rating = rate(i);
		if (rating < minRating) {
			currentMin = i;
			minRating = rating;
		}
	}
	return [currentMin, minRating];
}

/**
 * Finds the maximum of a list using the given rating function.
 * Calls rate exactly list.length times
 * @param list - the array to search
 * @param rate - a function calculating a rating for a given list entry
 * @returns the maximum of the list
 */
export function max<T>(list: T[], rate: (a: T) => number): [T | undefined, number] {
	let currentMax: T | undefined = undefined;
	let maxRating = -Infinity;
	for (const i of list) {
		const rating = rate(i);
		if (rating > maxRating) {
			currentMax = i;
			maxRating = rating;
		}
	}
	return [currentMax, maxRating];
}

/**
 * Paritions a list in two list.
 * The first return value will be a list with all elements fullfilling the pred,
 * the second return value a list with all element that do not fullfill the pred.
 * @param list - The list to check
 * @param pred - The predicate to apply
 */
export function partition<T>(list: T[], pred: (a: T) => boolean): [T[], T[]] {
	let accepted = [];
	let rejected = [];
	for (const elem of list) {
		if (pred(elem)) {
			accepted.push(elem);
		} else {
			rejected.push(elem);
		}
	}
	return [accepted, rejected];
}

/**
 * Creates a new array with all sub arrays elements concatinated into it
 * @param list - The list to flatten
 */
export function flat<T>(list: T[][]): T[] {
	return list.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Creates a new array containing all whole numbers from start inclusive to
 * stop exclusive
 * @param start - The start value (inclusive)
 * @param stop - The stop value (exclusive)
 */
export function range(start: number, stop: number): number[] {
	return Array.from({ length: stop - start }, (_, i) => start + i);
}

/**
 * Creates a new array of n evenly spaces numbers ranging from a to b, both
 * inclusive
 * @param n - The number of elements to generate
 * @param a - The start value (inclusive)
 * @param b - The end value (inclusive)
 */
export function linspace(n: number, a: number, b: number): number[] {
	const step = n <= 1 ? 0 : (b - a) / (n - 1);
	return range(0, n).map((i) => a + step * i);
}

/**
 * Creates a new array containing the elements of t and s in pairs,
 * the returned array has the length of t or s, whichever is shorter
 * @param t, s - The arrays to zip
 */
export function zip<T, S>(t: T[], s: S[]): [T, S][] {
	const length = Math.min(t.length, s.length);
	return Array.from({ length }, (_, i: number) => [t[i], s[i]]);
}
