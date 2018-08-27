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
let undefinedObj = Object.freeze([]);

function getFromCache (cached: Map<any, any>, params: any[]): any {
	let pcount = params.length;
	params.unshift(pcount);

	let entry = cached;
	for (let i = 0; i<pcount+1;i++) {
		let param = params[i];
		if (param == undefined) {
			param = undefinedObj;
		}
		if (!(entry instanceof Map)) {
			return undefined;
		}
		entry = entry.get(param);
		if (entry == undefined) {
			return undefined;
		}
	}
	return entry;
}

function setInCache (cached: Map<any, any>, params: any[], result: any | any[]) {
	let pcount = params.length;
	params.unshift(pcount);

	let entry: Map<any, any> | any = cached;
	for (let i = 0;i<pcount+1;i++) {
		let param = params[i];
		// undefined can't be used as a map index
		if (param == undefined) {
			param = undefinedObj;
		}
		if (i == pcount) {
			entry.set(param, result);
			return;
		} else if (!entry.has(param)) {
			let newEntry = new Map<any, any>();
			entry.set(param, newEntry);
		}
		entry = entry.get(param);
	}
}

let undefResult = Object.freeze([]);

function makeCached <F extends Function>(f: F, keepForever: boolean): F {
	let cached: Map<any, any> = new Map<any, any>();
	if (!keepForever) {
		cleanup.push(
			function() {
				cached = new Map<any, any>();
			}
		);
	}
	return <F><any>(function(...args: any[]): any[] | any {
		let result = getFromCache(cached, args);
		args.shift();
		if (result == undefined) {
			result = f(...args);
			if (result === undefined) {
				result = undefResult;
			}
			setInCache(cached, args, result);
		}
		if (result === undefResult) {
			return undefined;
		}
		return result;
	});
}

/// Wraps a function call, the returned value is cached for this strategy run
// @name forFrame
// @param f function - function to wrap
// @return function - wrapped function
export function forFrame <F extends Function>(f: F): F {
	return makeCached(f, false);
}

/// Wraps a function call, the returned value is cached until the strategy is reloaded
// @name forever
// @param f function - function to wrap
// @return function - wrapped function
export function forever <F extends Function>(f: F): F {
	return makeCached(f, true);
}

/// Clears the value cache for the current frame
// @name resetFrame
export function resetFrame () {
	for (let obj of cleanup) {
		obj();
	}
}