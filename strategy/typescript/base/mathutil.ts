/**
 * @module math
 * Extensions to javascript math functions
 */

/**************************************************************************
*   Copyright 2018 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*       André Pscherer, Andreas Wendler                                   *
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

let min = Math.min;
let max = Math.max;
import * as Option from "base/option";
import { Random } from "base/random";

let amunCopy = amun;

interface RandomLike {
	nextNumber53(): number;
	nextInt32(range?: [number, number]): number;
}

interface RandomMinor {
	nextNumber53(): number;
}

class ExtendedRandom {
	private _random: RandomMinor;
	constructor(random: RandomMinor) {
		this._random = random;
	}
	nextNumber53(): number {
		return this._random.nextNumber53();
	}
	nextInt32(range?: [number, number]): number {
		if (range == undefined) {
			throw new Error("nextInt32 without range is not possible for ExtendedRandom");
		}
		return Math.floor(this._random.nextNumber53() * (range[1] - range[0] + 1) + range[0]);
	}
}

const USE_LUA_PRNG = Option.addOption("Enable Lua PRNG", false);

function produceRandom(seed?: number): RandomLike {
	if (seed == undefined) {
		seed = new Date().getTime();
	}
	if (USE_LUA_PRNG) {
		amunCopy.luaRandomSetSeed(seed);
		// as changing luaRandom fires a strategy reload, we can safely assume that _random is either a luaPRNG or undefined
		return _random == undefined ? new ExtendedRandom({ nextNumber53: amunCopy.luaRandom }) : _random;
	} else {
		return new Random(seed);
	}
}

let _random: RandomLike | undefined = undefined;

/** Seeds the PRNG with the given seed */
export function randomseed(seed: number): void {
	_random = produceRandom(seed);
}

function initRandom(): void {
	if (_random == undefined) {
		if (amun.isDebug) {
			throw new Error("Unseeded Random was tried");
		}
		_random = produceRandom();
	}
}

/** Generates a random number on [0,1) with 53-bit resolution */
export function random(): number {
	initRandom();
	return _random!.nextNumber53();
}

/**
 * Generates an int32 pseudo random number, faster than random()
 * @param range - An optional [from, to] range, if not specified the result will be in range [0,0xffffffff]
 * from and to are inclusive in the range
 */
export function randomInt(range?: [number, number]): number {
	if (range != undefined && range[1] - range[0] < 0) {
		throw new Error("randomInt: range size can't be negative or zero");
	}
	initRandom();
	return _random!.nextInt32(range);
}

/**
 * Limits value to interval [min, max].
 * @param vmin - Lower bound of interval
 * @param par - Value to limit to interval
 * @param vmax - Upper bound of interval
 * @returns par limited to interval [min, max]
 */
export function bound(vmin: number, par: number, vmax: number): number {
	return min(max(vmin, par), vmax);
}

/**
 * Rounds value towards dest.
 * The function provides a helper to implement hysteresis for certain functions.
 * If the value is in the interval [dest-0.5-spacing/2, dest+0.5+spacing/2] then dest is returned.
 * Otherwise it behaves like Math.round.
 * @param val - value to round
 * @param dest - value to round towards, must be an integer
 * @param spacing - spacing between to numbers where we round towards dest
 */
export function roundTowards(val: number, dest: number, spacing: number) {
	if (val > dest + 0.5 + spacing / 2 || val < dest - 0.5 - spacing / 2) {
		return Math.round(val);
	} else {
		return dest;
	}
}

/**
 * Rounds value upwards.
 * The function provides a helper to implement hysteresis for certain functions.
 * Rounds the suffixes in [0.5 - spacing, 1] upwards
 * @param val - Value to round
 * @param spacing - Tolerance for rounding up
 */
export function roundUpwards(val: number, spacing: number): number {
	if (val + spacing + 0.5 >= Math.ceil(val)) {
		return Math.ceil(val);
	} else {
		return Math.floor(val);
	}
}

/**
 * Round value to idp digits
 * @example round(1.23, 1) -> 1.2
 * @param val - Number
 * @param digits - Digits to keep after decimal dot
 * @returns The rounded value
 */
export function round(val: number, digits: number = 0): number {
	let fac = 10 ** digits;
	return Math.floor(val * fac + 0.5) / fac;
}


/** Solves a*t + b for t */
export function solveLin(a: number, b: number): number | undefined {
	if (a === 0) {
		return;
	}
	return -b / a;
}


function sgn(value: number): 1 | -1 {
	if (value >= 0) {
		return 1;
	} else {
		return -1;
	}
}

/**
 * Solves a*t^2 + b*t + c for t
 * @returns The smallest positive solution or largest
 */
export function solveSq(a: number, b: number, c: number): [number, number?] | [] {
	if (a === 0) {
		// return Math.solveLin(b, c)
		if (b === 0) {
			return [];
		} else {
			return [-c / b];
		}
	}

	let det = b * b - 4 * a * c;
	if (det < 0) {
		return [];
	} else if (det === 0) {
		return [-b / (2 * a)];
	}
	det = Math.sqrt(det);
	let t2 = (-b - sgn(b) * det) / (2 * a);
	let t1 = c / (a * t2);
	let minTi = Math.min(t1, t2);

	// if both are >= 0 return smallest
	// if only one is >= 0 the it's the larger value of both
	// && the smallest positive solution
	if ((minTi >= 0 && t1 < t2) || (minTi < 0 && t1 >= t2)) {
		return [t1, t2];
	} else {
		return [t2, t1];
	}
}

/**
 * Calculates" the signum of a number
 * @returns 1 for postive number, -1 for negative number, 0 for 0
 */
export function sign(value: number): -1 | 0 | 1 {
	if (value > 0) {
		return 1;
	} else if (value < 0) {
		return -1;
	} else {
		return 0;
	}
}

export function average(array: number[], indexStart: number = 0, indexEnd: number = array.length): number {
	let sum = 0;
	for (let i = indexStart; i < indexEnd; i++) {
		sum += array[i];
	}
	return sum / (indexEnd - indexStart);
}

export function variance(array: number[], avg?: number, indexStart: number = 0, indexEnd: number = array.length): number {
	if (avg == undefined) {
		avg = average(array, indexStart, indexEnd);
	}
	let variance = 0;
	for (let i = indexStart; i < indexEnd; i++) {
		let diff = array[i] - avg;
		variance = variance + diff * diff;
	}
	return variance / (indexEnd - indexStart);
}

