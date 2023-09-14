/**
 * @module hyst
 * When discretizing a continuous input signal into discrete outputs (like
 * states or decisions), noise in the input signal can lead to frequent
 * state changes or redecisions. To avoid that, one uses hystereses.
 *
 * If the input looks something like this:
 *
 *                               _________ input
 *                              /
 *                 _           /
 *        ___     / \   /\_   /
 *   ----/---\---/---\_/---\_/------------ threshold
 *      /     \_/
 *     /
 *   _/
 *
 * Without a hystersis, the output might look like this
 *
 *   0000111110001111101111101111111111111 output without hysteresis
 *
 * To avoid frequent flickering of the output, instead of a single threshold,
 * there are now two thresholds:
 *
 *                               _________ input
 *                              /
 *   --------------_-----------/---------- upper threshold (= original threshold + hysteresis value)
 *        ___     / \   /\_   /
 *   - - / - \ - / - \_/ - \_/ - - - - - - original threshold
 *      /     \_/
 *   --/---------------------------------- lower threshold (= original threshold - hysteresis value)
 *   _/
 *
 * For the comparison to result in true, the input needs to be above the upper
 * threshold, and for the comparison to result in false, the input needs to
 * be less than the lower threshold. If the input is inbetween the thresholds,
 * the previous result is returned.
 *
 * Now the result looks like this:
 *
 *   0000000000000000000000000011111111111 output without hysteresis
 *
 * This module defines several generic hysteresis classes for this usecase,
 * such as:
 *   - LowerThanHyst: a hysteresis for < comparisons
 *   - GreaterThanHyst: a hysteresis for > comparisons
 */

/**************************************************************************
*   Copyright 2023 Christoph Schmidtmeier                                 *
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

export interface Hyst<In, Out> {
	state: Out;
	update(x: In): Out;
}

/**
 * A hysteresis for < comparisons.
 *
 * Use this class when comparing a noisy, continuous value with a constant,
 * to avoid flickering of the result.
 *
 * See the documentation of this module for an example.
 */
export class LessThanHyst implements Hyst<number, boolean> {
	private lowerBound: number;
	private upperBound: number;
	public state: boolean;

	/**
	 * Constructs a hysteresis for < comparisons.
	 *
	 * @param threshold - The right hand side of the comparison
	 * @param hyst - The offset from the threshold needed for an input
	 * to be less than or greater than the threshold
	 * @param initialState - The initial state of the hysteresis
	 */
	constructor(threshold: number, hyst: number, initialState: boolean = false) {
		this.state = initialState;
		this.lowerBound = threshold - hyst;
		this.upperBound = threshold + hyst;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		if (x < this.lowerBound) {
			this.state = true;
		}
		if (x > this.upperBound) {
			this.state = false;
		}
		return this.state;
	}


	/**
	 * Returns a string representation of the hysteresis, used for base/debug
	 * @returns A string representation of the hysteresis
	 */
	public _toString() {
		return `LowerThanHyst(bounds: [${this.lowerBound}, ${this.upperBound}], state: ${this.state})`;
	}

	/**
	 * Returns a string representation of the hysteresis
	 * @returns A string representation of the hysteresis
	 */
	public toString() {
		return this._toString();
	}
}

/**
 * A hysteresis for > comparisons.
 *
 * Use this class when comparing a noisy, continuous value with a constant,
 * to avoid flickering of the result.
 *
 * See the documentation of this module for an example.
 */
export class GreaterThanHyst implements Hyst<number, boolean> {
	private lessThan: LessThanHyst;

	// these are just needed for toString()
	private lowerBound: number;
	private upperBound: number;

	/**
	 * Constructs a hysteresis for < comparisons.
	 *
	 * @param threshold - The right hand side of the comparison
	 * @param hyst - The offset from the threshold needed for an input
	 * to be less than or greater than the threshold
	 * @param initialState - The initial state of the hysteresis
	 */
	constructor(threshold: number, hyst: number, initialState: boolean = false) {
		this.lessThan = new LessThanHyst(threshold, hyst, !initialState);
		this.lowerBound = threshold - hyst;
		this.upperBound = threshold + hyst;
	}

	public get state(): boolean {
		return !this.lessThan.state;
	}

	public set state(newState: boolean) {
		this.lessThan.state = !newState;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		this.lessThan.update(x);
		return this.state;
	}


	/**
	 * Returns a string representation of the hysteresis, used for base/debug
	 * @returns A string representation of the hysteresis
	 */
	public _toString() {
		return `GreaterThanHyst(bounds: [${this.lowerBound}, ${this.upperBound}], state: ${this.state})`;
	}

	/**
	 * Returns a string representation of the hysteresis
	 * @returns A string representation of the hysteresis
	 */
	public toString() {
		return this._toString();
	}
}

