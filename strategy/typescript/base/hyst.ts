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
 *   - MultiValueHyst: a hysteresis to check if a number is in one of several intervals.
 *   - VectorHyst: a hysteresis to check if a vector is close to another one.
 *   - AngleHyst: a hysteresis to check if an angle is close to another one.
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

import { Vector } from "base/vector";

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
 *
 * How this class is intended to be used:
 * Usually, when you want to check if a value is less than some threshold,
 * you'd write
 *
 *     if (value < threshold) {
 *         ...
 *     }
 *
 * If value is a noisy value (for example, from the vision), this comparison
 * will flicker. To prevent this, we need to add a hysteresis to this comparison:
 *
 *     if (this.belowThreshold.update(value)) {
 *         ...
 *     }
 *
 * And in the constructor of the object:
 *
 *     constructor() {
 *         ...
 *         this.belowThreshold = new LessThanHyst(threshold, HYST);
 *     }
 *
 * The choice of HYST depends on multiple factors:
 *   - how responsive the comparison must be. larger values for HYST lead to slower
 *     (but more stable) decisions
 *   - how noisy the value is: choosing HYST to small can still allow flickering
 *   - ...
 */
export class LessThanHyst implements Hyst<number, boolean> {
	private _lowerBound: number;
	private _upperBound: number;
	public state: boolean;

	/**
	 * Constructs a hysteresis for < comparisons.
	 *
	 * @param threshold - The right hand side of the comparison
	 * @param hyst - The offset from the threshold needed for an input
	 * to be less than or greater than the threshold
	 * @param initialState - The initial state of the hysteresis
	 */
	public constructor(threshold: number, hyst: number, initialState: boolean = false) {
		if (hyst < 0) {
			throw Error(`trying to create hysteresis with a hysteresis value of ${hyst}`);
		}
		this.state = initialState;
		this._lowerBound = threshold - hyst;
		this._upperBound = threshold + hyst;
	}

	/**
	 * Constructs a hysteresis for < comparisons.
	 *
	 * @param lower - The lower threshold the value needs to cross to make this hysteresis return true
	 * @param upper - The upper threshold the value needs to cross to make this hysteresis return false
	 * @param initialState - The initial state of the hysteresis
	 */
	public static fromBounds(lower: number, upper: number, initialState: boolean = false): LessThanHyst {
		const thresh = (lower + upper) / 2;
		const hyst = (upper - lower) / 2;
		return new LessThanHyst(thresh, hyst, initialState);
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
		return (this._lowerBound + this._upperBound) / 2;
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
		return (this._upperBound - this._lowerBound) / 2;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		if (x < this._lowerBound) {
			this.state = true;
		}
		if (x > this._upperBound) {
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
 * See the documentation of this module for an example and {@link LessThanHyst}
 * for usage info.
 */
export class GreaterThanHyst implements Hyst<number, boolean> {
	private _lessThan: LessThanHyst;

	/**
	 * Constructs a hysteresis for < comparisons.
	 *
	 * @param threshold - The right hand side of the comparison
	 * @param hyst - The offset from the threshold needed for an input
	 * to be less than or greater than the threshold
	 * @param initialState - The initial state of the hysteresis
	 */
	public constructor(threshold: number, hyst: number, initialState: boolean = false) {
		this._lessThan = new LessThanHyst(threshold, hyst, !initialState);
	}

	/**
	 * Constructs a hysteresis for > comparisons.
	 *
	 * @param lower - The lower threshold the value needs to cross to make this hysteresis return false
	 * @param upper - The upper threshold the value needs to cross to make this hysteresis return true
	 * @param initialState - The initial state of the hysteresis
	 */
	public static fromBounds(lower: number, upper: number, initialState: boolean = false): GreaterThanHyst {
		const thresh = (lower + upper) / 2;
		const hyst = (upper - lower) / 2;
		return new GreaterThanHyst(thresh, hyst, initialState);
	}

	public get state(): boolean {
		return !this._lessThan.state;
	}

	public set state(newState: boolean) {
		this._lessThan.state = !newState;
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
		return this._lessThan.threshold;
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
		return this._lessThan.hyst;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		this._lessThan.update(x);
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
 *
 * How this class is intended to be used:
 * Usually, when you want to check if a value is less than some threshold,
 * you'd write
 *
 *     if (a < value && value < b) {
 *         ...
 *     }
 *
 * If value is a noisy value (for example, from the vision), this comparison
 * will flicker. To prevent this, we need to add a hysteresis to this comparison:
 *
 *     if (this.inInterval.update(value)) {
 *         ...
 *     }
 *
 * And in the constructor of the object:
 *
 *     constructor() {
 *         ...
 *         this.inInterval = new InIntervalHyst([a, b], HYST);
 *     }
 *
 * Also see {@link LessThanHyst} more for more usage info and some tips for the
 * choice of HYST.
 */
export class InIntervalHyst implements Hyst<number, boolean> {
	// if the value is lower than the upper bound of the interval
	// and greater than the lower bound, it is in the interval
	private _lessThan: LessThanHyst;
	private _greaterThan: GreaterThanHyst;

	/**
	 * Constructs a hysteresis to check if a number is in an interval.
	 *
	 * @param interval - Defines the lower and upper end of the interval,
	 * as well as the hyst value.
	 * @param initialState - The initial state of the hysteresis
	 */
	public constructor(interval: [number, number], hyst: number, initialState: boolean = false) {
		const [lower, upper] = interval;
		if (lower > upper) {
			throw Error(`trying to create interval hysteresis for interval [${lower}, ${upper}]`);
		}

		// regarding initialState: if it's true, everything works out nicely, but if it's false, this puts
		// us in an invalid state where both lessThan and greaterThan are in the 'false' state, which can't
		// actually happen through updating the hysteresis.
		// But this doesn't cause any trouble as for the hysteresis to be in the 'true' state, both lessThan
		// and greaterThan must be in the 'true' state.
		this._lessThan = new LessThanHyst(upper, hyst, initialState);
		this._greaterThan = new GreaterThanHyst(lower, hyst, initialState);
	}

	public get state(): boolean {
		return this._lessThan.state && this._greaterThan.state;
	}

	public set state(newState: boolean) {
		// see comment in the constructor for newState = false
		this._lessThan.state = newState;
		this._greaterThan.state = newState;
	}

	/**
	 * The targeted interval.
	 *
	 * @returns the targeted interval
	 */
	public get interval(): [number, number] {
		return [this._greaterThan.threshold, this._lessThan.threshold];
	}

	/**
	 * The hysteresis value defines the size of the transition
	 * regions.
	 *
	 * @returns the hysteresis value
	 */
	public get hyst(): number {
		// both lessThan and greaterThan have the same hyst value
		return this._lessThan.hyst;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		this._lessThan.update(x);
		this._greaterThan.update(x);
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

/**
 * A hysteresis to check if a number is in one of several intervals.
 *
 * Use this class when checking if a noisy, continuous value is
 * in one of many intervals, to avoid flickering of the result.
 *
 * hyst (<-|-> denotes transition regions):       0.2
 *                  <-|->       <-|->    <-|->    <-|-> <-|->
 * thresholds:        1           3       4.5       6     7
 *             -------|-----------|--------|--------|-----|---------
 * values:         A        B         C        D       E      F
 *
 * See the documentation of this module for an example.
 *
 * Also see {@link LessThanHyst} and {@link InIntervalHyst} for usage info
 * and some tips for the choice of HYST.
 */
export class MultiValueHyst<T> implements Hyst<number, T> {
	private _lessThans: LessThanHyst[];
	private _values: T[];
	private _index: number;

	/**
	 * Constructs a hysteresis to check if a number is in one of several intervals.
	 *
	 * @param values - The values to return in the intervals
	 * @param thresholds - The boundaries of the intervals, needs to
	 * be one less threshold than there are values
	 * @param hyst - The offset from the threshold needed for an input
	 * to be less than or greater than a threshold
	 * @param initialState - The initial state of the hysteresis
	 */
	public constructor(values: T[], thresholds: number[], hyst: number, initialState: T = values[0]) {
		if (values.length < 2) {
			throw Error(`MultiValueHyst needs at least 2 values, but got only ${values.length} values`);
		}
		if (values.length !== thresholds.length + 1) {
			throw Error(`MultiValueHyst needs n + 1 values for n thresholds, but got ${thresholds.length} thresholds for ${values.length} values`);
		}

		this._values = values;
		this._index = values.indexOf(initialState);
		if (this._index === -1) {
			throw Error(`MultiValueHyst got initial state ${initialState}, which is not in possible values [${values}]`);
		}

		this._lessThans = thresholds.map((thresh, i) => new LessThanHyst(thresh, hyst, i > this._index));
	}

	public get state(): T {
		return this._values[this._index];
	}

	public set state(newState: T) {
		this._index = this._values.indexOf(newState);
		if (this._index === -1) {
			throw Error(`Trying to set state of MultiValueHyst to ${newState}, which is not in possible values [${this._values}]`);
		}
	}

	/**
	 * The thresholds are the boundaries of the intervals.
	 * The first interval ranges from [-inf, thresh1],
	 * the second one from  [thresh1, thresh2], and so on.
	 * The for the size of the transition regions see {@link hyst}.
	 *
	 * @returns the right hand side of the comparison
	 */
	public get thresholds(): number[] {
		return this._lessThans.map((lt) => lt.threshold);
	}

	/**
	 * The hysteresis value defines the size of the transition
	 * regions.
	 *
	 * @returns the hysteresis value
	 */
	public get hyst(): number {
		// all lessThans have the same hyst value
		return this._lessThans[0].hyst;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): T {
		this._index = 0;
		for (const lessThan of this._lessThans) {
			if (!lessThan.update(x)) {
				this._index++;
			}
		}
		return this.state;
	}


	/**
	 * Returns a string representation of the hysteresis, used for base/debug
	 * @returns A string representation of the hysteresis
	 */
	public _toString() {
		return `MultiValueHyst(thresholds: [${this.thresholds}], hyst: ${this.hyst}, values: ${this._values}, state: ${this.state}=values[${this._index}])`;
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
 * A hysteresis to check if a vector is close to another one.
 *
 * Use this class when checking if a noisy vector is close to
 * a target vector, to avoid flickering of the result.
 *
 * See the documentation of this module for an example.
 *
 * How this class is intended to be used:
 * Usually, when you want to check if a vector is close to a target,
 * you'd write
 *
 *     if (target.distanceToSq(v) < DIST * DIST) {
 *         ...
 *     }
 *
 * If v is a noisy value (for example, from the vision), this comparison
 * will flicker. To prevent this, we need to add a hysteresis to this comparison:
 *
 *     if (this.closeToTarget.update(v)) {
 *         ...
 *     }
 *
 * And in the constructor of the object:
 *
 *     constructor() {
 *         ...
 *         this.closeToTarget = new VectorHyst(target, DIST, HYST);
 *     }
 *
 * Also see {@link LessThanHyst} more for more usage info and some tips for the
 * choice of HYST.
 */
export class VectorHyst implements Hyst<Vector, boolean> {
	private _lessThan: LessThanHyst;

	/**
	 * The targeted value, the vector the input has to be close to
	 * to make this hysteresis true
	 */
	public readonly target: Vector;

	/**
	 * The targeted angle, i.e. the angle in the center of the interval
	 * (see the constructor comment for more context)
	 */
	public readonly threshold: number;

	/**
	 * The hysteresis value defines the size of the transition
	 * regions
	 */
	public readonly hyst: number;

	/**
	 * Constructs a hysteresis to check if a vector is close to another one.
	 *
	 * @param target - The targeted vector
	 * @param thresh - the distance the input can be from the target to
	 * still be considered close to it
	 * @param hyst - The hysteresis value around dist
	 * @param initialState - The initial state of the hysteresis
	 */
	public constructor(target: Vector = new Vector(0, 0), threshold: number, hyst: number, initialState: boolean = false) {
		if (threshold < 0) {
			throw new Error(`dist has to be greater than 0, but is ${threshold}`);
		}
		if (hyst > threshold) {
			throw new Error(`hyst needs to be less than threshold (=${threshold}), but is ${hyst}`);
		}

		// to avoid having to calculate a square root every update, choose the appropriate bounds for
		// the squared distance
		this._lessThan = LessThanHyst.fromBounds((threshold - hyst) ** 2, (threshold + hyst) ** 2, initialState);
		this.target = target;
		this.threshold = threshold;
		this.hyst = hyst;
	}

	public get state(): boolean {
		return this._lessThan.state;
	}

	public set state(newState: boolean) {
		this._lessThan.state = newState;
	}

	/**
	 * Updates the hysteresis
	 *
	 * @param x - The new value
	 * @returns The new state of the hysteresis
	 */
	public update(x: Vector): boolean {
		return this._lessThan.update(this.target.distanceToSq(x));
	}


	/**
	 * Returns a string representation of the hysteresis, used for base/debug
	 * @returns A string representation of the hysteresis
	 */
	public _toString() {
		return `VectorHyst(target: ${this.target}, thresh: ${this.threshold}, hyst: ${this.hyst}, state: ${this.state})`;
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
 * A hysteresis to check if an angle is close to another one.
 *
 * Use this class when checking if a noisy angle is close to
 * a target angle, to avoid flickering of the result.
 *
 * See the documentation of this module for an example.
 *
 * How this class is intended to be used:
 * Usually, when you want to check if an angle is in an interval,
 * you'd write
 *
 *     const normalizedAngle = geom.normalizedAngle(angle);
 *     if (0 < normalizedAngle && normalizedAngle < Math.PI) {
 *         ...
 *     }
 *
 * If angle is a noisy value (for example, from the vision), this comparison
 * will flicker. To prevent this, we need to add a hysteresis to this comparison:
 *
 *     if (this.inAngleInterval.update(angle)) {
 *         ...
 *     }
 *
 * And in the constructor of the object:
 *
 *     constructor() {
 *         ...
 *         this.inAngleInterval = new AngleHyst(Math.PI / 2, Math.PI / 2, HYST);
 *     }
 *
 * Also see {@link LessThanHyst} more for more usage info and some tips for the
 * choice of HYST.
 */
export class AngleHyst implements Hyst<number, boolean> {
	private _inInterval: InIntervalHyst;

	/**
	 * The targeted angle, i.e. the angle in the center of the interval
	 * (see the constructor comment for more context)
	 */
	public readonly target: number;

	/**
	 * Constructs a hysteresis to check if an angle is close to another one.
	 *
	 * Representing angle intervals can be tricky, because of the discontinuity
	 * normalized angles have. So instead of using normalized angles for the
	 * interval bounds, we just allow non normalized angles, where the second
	 * angle in the interval always has to be larger than the first one.
	 *
	 * In this case, we represent the angle interval as a targeted value and an
	 * offset around it: [target - diff, target + diff]. That is the interval
	 * the hysteresis is checking for.
	 *
	 * So to enter the interval (so the value was previously outside the interval
	 * and the current state of the hysteresis is false), the value has to be in
	 * [target - diff + hyst, target + diff - hyst].
	 *
	 * @param target - The targeted angle
	 * @param diff - the difference between the input and the target for the
	 * input to still be in the interval
	 * @param hyst - The hysteresis value around the interval
	 * @param initialState - The initial state of the hysteresis
	 */
	public constructor(target: number, diff: number, hyst: number, initialState: boolean = false) {
		if (diff < 0) {
			throw new Error(`diff has to be greater than 0, but is ${diff}`);
		}
		if (diff > Math.PI) {
			throw new Error(`diff has to be less than pi, but is ${diff}`);
		}
		if (hyst > diff) {
			throw new Error(`hyst needs to be less than diff (=${diff}), but is ${hyst}`);
		}

		this._inInterval = new InIntervalHyst([target - diff, target + diff], hyst, initialState);
		this.target = target;
	}

	public get state(): boolean {
		return this._inInterval.state;
	}

	public set state(newState: boolean) {
		this._inInterval.state = newState;
	}

	/**
	 * The difference between the input and the target for the
	 * input to still be in the interval
	 *
	 * @returns the hysteresis value
	 */
	public get diff(): number {
		const [lower, upper] = this._inInterval.interval;
		return (upper - lower) / 2;
	}

	/**
	 * The hysteresis value defines the size of the transition
	 * regions
	 *
	 * @returns the hysteresis value
	 */
	public get hyst(): number {
		return this._inInterval.hyst;
	}

	/**
	 * Updates the hysteresis
	 *
	 * The angle x does not need to be normalized, this method takes care of that.
	 *
	 * @param x - The new value, does not need to be normalized
	 * @returns The new state of the hysteresis
	 */
	public update(x: number): boolean {
		// we normalize the input angle to the interval [target - pi, target + pi]
		// because then we can simply check if the input is in the interval
		// [target - diff, target + diff], which is exactly what inInterval does
		//
		// This off-center normalization has the effect that the angle discontinuity
		// is opposite of the interval we are interested in.

		const lower = this.target - Math.PI;
		while (x < lower) {
			x += 2 * Math.PI;
		}

		const upper = this.target + Math.PI;
		while (x > upper) {
			x -= 2 * Math.PI;
		}
		return this._inInterval.update(x);
	}


	/**
	 * Returns a string representation of the hysteresis, used for base/debug
	 * @returns A string representation of the hysteresis
	 */
	public _toString() {
		return `AngleHyst(target: ${this.target}, diff: ${this.diff}, hyst: ${this.hyst}, state: ${this.state})`;
	}

	/**
	 * Returns a string representation of the hysteresis
	 * @returns A string representation of the hysteresis
	 */
	public toString() {
		return this._toString();
	}
}

