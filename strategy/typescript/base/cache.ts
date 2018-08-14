/*
// Provides a caching mechanism for function calls
// module "Cache"
*/

/**************************************************************************
*   Copyright 2018 Michael Eischer, Andreas Wendler                       *
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

let cleanup: Function[] = [];
let undefinedObj = [];

function getFromCache (cached, params: any[]): any[] {
	let pcount = table.maxn(params);
	params[0] = pcount;

	let entry = cached;
	for (i = 0, pcount) {
		let param = params[i];
		if (param == undefined) {
			param = undefinedObj;
		}
		entry = entry[param];
		if (entry == undefined) {
			return undefined;
		}
	}
	return entry;
}

function setInCache (cached, params, result) {
	let pcount = table.maxn(params);
	params[0] = pcount;

	let entry = cached;
	for (i = 0, pcount) {
		let param = params[i];
		// undefined can't be used as array index
		if (param == undefined) {
			param = undefinedObj;
		}
		if (i == pcount) {
			entry[param] = result;
			return;
		} else if (entry[param] == undefined) {
			let newEntry = {};
			setmetatable(newEntry, {__mode = "k"});
			entry[param] = newEntry;
		}
		entry = entry[param];
	}
}

function makeCached (f: Function, keepForever: boolean) {
	let cached = {};
	if (!keepForever) {
		cleanup.push(
			function() {
				cached = {};
			}
		);
	}
	return function(...args: any[]): any[] {
		let result = getFromCache(cached, args);
		if (result == undefined) {
			result = { f(...args) };
			setInCache(cached, args, result);
		}
		return result;
	}
}

/// Wraps a function call, the returned value is cached for this strategy run
// @name forFrame
// @param f function - function to wrap
// @return function - wrapped function
export function forFrame (f: Function): Function {
	return makeCached(f, false);
}

// the function argument must only have one return value
export function forFrameSingle (f: Function): Function {
	return makeCachedSingle(f, false);
}

/// Wraps a function call, the returned value is cached until the strategy is reloaded
// @name forever
// @param f function - function to wrap
// @return function - wrapped function
export function forever (f: Function): Function {
	return makeCached(f, true);
}

// the function argument must only have one return value
export function foreverSingle (f: Function): Function {
	return makeCachedSingle(f, true);
}

/// Clears the value cache for the current frame
// @name resetFrame
export function resetFrame () {
	for (let obj of cleanup) {
		obj();
	}
}