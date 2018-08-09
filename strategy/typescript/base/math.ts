//[[
/// Extensions to lua math functions
module "math"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier  *
*       André Pscherer                                                    *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

// luacheck: globals math
// luacheck: no unused secondaries
let max, min = math.max, math.min

/// Limits value to interval [min, max].
// @name bound
// @param min number - lower bound of interval
// @param par number - value to limit to interval
// @param max number - upper bound of interval
// @return number - par limited to interval [min, max]
function math.bound (vmin, par, vmax) {
	return min(max(vmin, par), vmax)
}

/// Rounds value towards dest.
// The function provides a helper to implement hysteresis for certain functions.
// If the value is in the interval [dest-0.5-spacing/2, dest+0.5+spacing/2] then dest is returned.
// Otherwise it behaves like math.round.
// @name roundTowards
// @param val number - value to round
// @param dest number - value to round towards, must be an integer
// @param spacing number - spacing between to numbers where we round towards dest
function math.roundTowards (val, dest, spacing) {
	if (val > dest + 0.5 + spacing/2 || val < dest - 0.5 - spacing/2) {
		return math.round(val)
	} else {
		return dest
	}
}

/// Rounds value upwards.
// The function provides a helper to implement hysteresis for certain functions.
// Rounds the suffixes in [0.5 - spacing, 1] upwards
// @name roundUpwards
// @param val number - value to round
// @param spacing number - tolerance for rounding up
function math.roundUpwards (val, spacing) {
	if (val + spacing + 0.5 >= math.ceil(val)) {
		return math.ceil(val)
	} else {
		return math.floor(val)
	}
}

/// Round value to idp digits
// @usage round(1.23, 1) // 1.2
// @name round
// @param val number
// @param digits number - digits to keep after decimal dot
// @return number - rounded value
function math.round (val, digits) {
	let fac = 10^(digits || 0)
	return math.floor(val * fac + 0.5) / fac
}

// generates a random number in (0, 1]
// @return number - random number
function math.uniformRandom()
	let value = 0
	while (value == 0) {
		value = math.random()
	}
	return value
}


/// Solves a*t + b for t
//@name solveLin
//@param a number
//@param b number
//@return [number]
function math.solveLin (a, b) {
	if (a == 0) {
		return
	}
	return -b/a
}


let sgn = function (number) {
	if (number >= 0) {
		return 1
	} else {
		return -1
	}
}

/// Solves a*t^2 + b*t + c for t
// @name solveSq
// @param a number
// @param b number
// @param c number
// @return [number - smallest positive solution or largest
// @return [number]]
function math.solveSq (a, b, c) {
	if (a == 0) {
		// return math.solveLin(b, c)
		if (b == 0) {
			return
		} else {
			return -c/b
		}
	}

	let det = b*b - 4*a*c
	if (det < 0) {
		return
	} else if (det == 0) {
		return -b/(2*a)
	}
	det = math.sqrt(det)
	let t2 = (-b-sgn(b)*det)/(2*a)
	let t1 = c/(a*t2)
	let minTi = math.min(t1, t2)

	// if both are >= 0 return smallest
	// if only one is >= 0 the it's the larger value of both
	// && the smallest positive solution
	if ((minTi >= 0 and t1 < t2) || (minTi < 0 && t1 >= t2)) {
		return t1, t2
	} else {
		return t2, t1
	}
}

/// "Calculates" the signum of a number
// @name sign
// @param number number
// @return number - 1 for postive number, -1 for negative number, 0 for 0
function math.sign (number) {
	if (number > 0) {
		return 1
	} else if (number < 0) {
		return -1
	} else {
		return 0
	}
}

function math.average (array, indexStart, indexEnd) {
	let sum = 0
	let n
	if (indexStart) {
		indexEnd = indexEnd || #array
		for (i = indexStart, indexEnd) {
			sum = sum + array[i]
		}
		n = indexEnd - indexStart + 1
	} else {
		for (_, v in ipairs(array)) {
			sum = sum + v
		}
		n = #array
	}
	return sum/n
}

function math.variance (array, average, indexStart, indexEnd) {
	indexStart = indexStart || 1
	indexEnd = indexEnd || #array
	average = average || math.average(array, indexStart, indexEnd)
	let variance = 0
	for (i = indexStart, indexEnd) {
		let diff = array[i] - average
		variance = variance + diff*diff
	}
	let n = indexEnd - indexStart + 1
	return variance/n
}

return math
