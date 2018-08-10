--[[
--- Extensions to lua math functions
module "math"
]]--

--[[***********************************************************************
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
************************************************************************]]

let min = Math.min;
let max = Math.max;

/// Limits value to interval [min, max].
// @name bound
// @param min number - lower bound of interval
// @param par number - value to limit to interval
// @param max number - upper bound of interval
// @return number - par limited to interval [min, max]
export function bound (vmin: number, par: number, vmax: number): number {
	return min(max(vmin, par), vmax);
}

/// Rounds value towards dest.
// The function provides a helper to implement hysteresis for certain functions.
// If the value is in the interval [dest-0.5-spacing/2, dest+0.5+spacing/2] then dest is returned.
// Otherwise it behaves like Math.round.
// @name roundTowards
// @param val number - value to round
// @param dest number - value to round towards, must be an integer
// @param spacing number - spacing between to numbers where we round towards dest
export function roundTowards (val: number, dest: number, spacing: number) {
	if (val > dest + 0.5 + spacing/2 || val < dest - 0.5 - spacing/2) {
		return Math.round(val);
	} else {
		return dest;
	}
}

/// Rounds value upwards.
// The function provides a helper to implement hysteresis for certain functions.
// Rounds the suffixes in [0.5 - spacing, 1] upwards
// @name roundUpwards
// @param val number - value to round
// @param spacing number - tolerance for rounding up
export function roundUpwards (val: number, spacing: number): number {
	if (val + spacing + 0.5 >= Math.ceil(val)) {
		return Math.ceil(val);
	} else {
		return Math.floor(val);
	}
}

/// Round value to idp digits
// @usage round(1.23, 1) // 1.2
// @name round
// @param val number
// @param digits number - digits to keep after decimal dot
// @return number - rounded value
export function round (val: number, digits: number = 0): number {
	let fac = Math.pow(10, digits);
	return Math.floor(val * fac + 0.5) / fac;
}


/// Solves a*t + b for t
//@name solveLin
//@param a number
//@param b number
//@return [number]
export function solveLin (a: number, b: number): number | undefined {
	if (a == 0) {
		return;
	}
	return -b/a;
}


function sgn (value: number): 1 | -1 {
	if (value >= 0) {
		return 1;
	} else {
		return -1;
	}
}

/// Solves a*t^2 + b*t + c for t
// @name solveSq
// @param a number
// @param b number
// @param c number
// @return [number - smallest positive solution or largest
// @return [number]]
export function solveSq (a: number, b: number, c: number): [number, number?] | undefined {
	if (a == 0) {
		// return Math.solveLin(b, c)
		if (b == 0) {
			return;
		} else {
			return [-c/b];
		}
	}

	let det = b*b - 4*a*c;
	if (det < 0) {
		return;
	} else if (det == 0) {
		return [-b/(2*a)];
	}
	det = Math.sqrt(det);
	let t2 = (-b-sgn(b)*det)/(2*a);
	let t1 = c/(a*t2);
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

/// "Calculates" the signum of a number
// @name sign
// @param number number
// @return number - 1 for postive number, -1 for negative number, 0 for 0
export function sign (value: number): -1 | 0 | 1 {
	if (value > 0) {
		return 1;
	} else if (value < 0) {
		return -1;
	} else {
		return 0;
	}
}

export function average (array: [number], indexStart: number = 0, indexEnd: number = array.length): number {
	let sum = 0;
	for (let i = indexStart;i<indexEnd;i++) {
		sum += array[i];
	}
	return sum / (indexEnd - indexStart);
}

export function variance (array: [number], avg?: number, indexStart: number = 0, indexEnd: number = array.length): number {
	if (avg == undefined) {
		avg = average(array, indexStart, indexEnd);
	}
	let variance = 0;
	for (let i = indexStart; i<indexEnd; i++) {
		let diff = array[i] - avg;
		variance = variance + diff*diff;
	}
	return variance / (indexEnd - indexStart);
}
