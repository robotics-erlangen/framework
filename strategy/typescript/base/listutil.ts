/**
 * @module listutil
 * Extensions to javascript array functions
 */

/**************************************************************************
*   Copyright 2018 Paul Bergmann                                          *
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
export function min<T>(list: T[], rate: (a: T) => number): [T, number] {
	if (amun.isDebug && list.length === 0) {
		throw new Error("The minimum of an empty list is undefined");
	}
	let currentMin: T;
	let minRating = Infinity;
	for (const i of list) {
		const rating = rate(i);
		if (rating < minRating) {
			currentMin = i;
			minRating = rating;
		}
	}
	return [ currentMin!, minRating ];
}

/**
 * Finds the maximum of a list using the given rating function.
 * Calls rate exactly list.length times
 * @param list - the array to search
 * @param rate - a function calculating a rating for a given list entry
 * @returns the maximum of the list
 */
export function max<T>(list: T[], rate: (a: T) => number): [T, number] {
	if (amun.isDebug && list.length === 0) {
		throw new Error("The maximum of an empty list is undefined");
	}
	let currentMax: T;
	let maxRating = Infinity;
	for (const i of list) {
		const rating = rate(i);
		if (rating > maxRating) {
			currentMax = i;
			maxRating = rating;
		}
	}
	return [ currentMax!, maxRating ];
}

