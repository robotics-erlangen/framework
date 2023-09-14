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
 *   - LessThanHyst: a hysteresis for < comparisons
 *   - GreaterThanHyst: a hysteresis for > comparisons
 *   - InIntervalHyst: a hysteresis to check if a number is in an interval.
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
		if (hyst < 0) {
			throw Error(`trying to create hysteresis with a hysteresis value of ${hyst}`);
		}
		this.state = initialState;
		this.lowerBound = threshold - hyst;
		this.upperBound = threshold + hyst;
	}

	/**
	 * The threshold is the right hand side of the comparison.
	 * For this hysteresis to return true, the input needs to
	 * be less than (threshold - hyst), and for this hysteresis
	 * to return false, the input needs to be greater than
	 * (threshold + hyst).
	 *
	 * @returns the right hand side of the comparison
	 */
	public get threshold(): number {
		return (this.lowerBound + this.upperBound) / 2;
	}

	/**
	 * The hysteresis value defines the size of the transition
	 * region. In the interval from [threshold - hyst,
	 * threshold + hyst], this hysteresis simply returns the
	 * previous result of the comparison.
	 *
	 * @param the offset from the threshold needed for an input
	 * to be less than or greater than the threshold
	 */
	public get hyst(): number {
		return (this.upperBound - this.lowerBound) / 2;
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
		return `LessThanHyst(threshold: ${this.threshold}, hyst: ${this.hyst}, state: ${this.state})`;
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
	}

	public get state(): boolean {
		return !this.lessThan.state;
	}

	public set state(newState: boolean) {
		this.lessThan.state = !newState;
	}

	/**
	 * The threshold is the right hand side of the comparison.
	 * For this hysteresis to return true, the input needs to
	 * be less than (threshold - hyst), and for this hysteresis
	 * to return false, the input needs to be greater than
	 * (threshold + hyst).
	 *
	 * @returns the right hand side of the comparison
	 */
	public get threshold(): number {
		return this.lessThan.threshold;
	}

	/**
	 * The hysteresis value defines the size of the transition
	 * region. In the interval from [threshold - hyst,
	 * threshold + hyst], this hysteresis simply returns the
	 * previous result of the comparison.
	 *
	 * @param the offset from the threshold needed for an input
	 * to be less than or greater than the threshold
	 */
	public get hyst(): number {
		return this.lessThan.hyst;
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
		return `GreaterThanHyst(threshold: ${this.threshold}, hyst: ${this.hyst}, state: ${this.state})`;
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
 * A hysteresis to check if a number is in an interval.
 *
 * Use this class when comparing a noisy, continuous value with a constant
 * interval, to avoid flickering of the result.
 *
 * See the documentation of this module for an example.
 */
export class InIntervalHyst implements Hyst<number, boolean> {
	// if the value is lower than the upper bound of the interval
	// and greater than the lower bound, it is in the interval
	private lessThan: LessThanHyst;
	private greaterThan: GreaterThanHyst;

	/**
	 * Constructs a hysteresis to check if a number is in an interval.
	 *
	 * @param interval - Defines the lower and upper end of the interval,
	 * as well as the hyst value.
	 * @param initialState - The initial state of the hysteresis
	 */
	constructor(interval: [number, number], hyst: number, initialState: boolean = false) {
		const [lower, upper] = interval;
		if (lower > upper) {
			throw Error(`trying to create interval hysteresis for interval [${lower}, ${upper}]`);
		}

		// regarding initialState: if it's true, everything works out nicely, but if it's false, this puts
		// us in an invalid state where both lessThan and greaterThan are in the 'false' state, which can't
		// actually happen through updating the hysteresis.
		// But this doesn't cause any trouble as for the hysteresis to be in the 'true' state, both lessThan
		// and greaterThan must be in the 'true' state.
		this.lessThan = new LessThanHyst(upper, hyst, initialState);
		this.greaterThan = new GreaterThanHyst(lower, hyst, initialState);
	}

	public get state(): boolean {
		return this.lessThan.state && this.greaterThan.state;
	}

	public set state(newState: boolean) {
		// see comment in the constructor for newState = false
		this.lessThan.state = newState;
		this.greaterThan.state = newState;
	}

	/**
	 * The targeted interval.
	 *
	 * @returns the targeted interval
	 */
	public get interval(): [number, number] {
		return [this.greaterThan.threshold, this.lessThan.threshold];
	}

	/**
	 * The hysteresis value defines the size of the transition
	 * regions.
	 *
	 * @returns the hysteresis value
	 */
	public get hyst(): number {
		// both lessThan and greaterThan have the same hyst value
		return this.lessThan.hyst;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		this.lessThan.update(x);
		this.greaterThan.update(x);
		return this.state;
	}


	/**
	 * Returns a string representation of the hysteresis, used for base/debug
	 * @returns A string representation of the hysteresis
	 */
	public _toString() {
		const [lower, upper] = this.interval;
		return `InIntervalHyst(interval: [${lower}, ${upper}], hyst: ${this.hyst}, state: ${this.state})`;
	}

	/**
	 * Returns a string representation of the hysteresis
	 * @returns A string representation of the hysteresis
	 */
	public toString() {
		return this._toString();
	}
}
