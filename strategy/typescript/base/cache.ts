/**
 * @module cache
 * Provides a caching mechanism for function calls
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
import { Vector } from "base/vector";

let cleanup: Function[] = [];
let undefinedObj = Object.freeze([]);
let undefinedVec = Object.freeze(new Vector(NaN, NaN));

function getFromCache(cached: Map<any, any>, params: any[]): any {
	let pcount = params.length;
	params.unshift(pcount);

	let entry = cached;
	for (let i = 0; i < pcount + 1; i++) {
		let param = params[i];
		if (param == undefined) {
			param = undefinedObj;
		} else if (param instanceof Vector) {
			pcount += 2;
			params.splice(i + 1, 0, param.x, param.y);
			param = undefinedVec;
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

function setInCache(cached: Map<any, any>, params: any[], result: any | any[]) {
	let pcount = params.length;
	params.unshift(pcount);

	let entry: Map<any, any> | any = cached;
	for (let i = 0; i < pcount + 1; i++) {
		let param = params[i];
		// undefined can't be used as a map index
		if (param == undefined) {
			param = undefinedObj;
		} else if (param instanceof Vector) {
			let v: Vector = <Vector> param;
			entry.set(undefinedVec, new Map<any, any>());
			entry = entry.get(undefinedVec);

			entry.set(v.x, new Map<any, any>());
			entry = entry.get(v.x);

			param = v.y;
		}
		if (i === pcount) {
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
	let cachedFunc: F = <F> <any> (function(...args: any[]): any[] | any {
		// getFromCache modifies args in case there is a vector inside, so make a copy
		let result = getFromCache(cached, args.slice());
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
	Object.defineProperty(cachedFunc, "name", { value: f.name, writable: false });
	return cachedFunc;
}

/**
 * Wraps a function call, the returned value is cached for this strategy run
 * @param f - The function to wrap
 * @returns The wrapped function
 */
export function forFrame <F extends Function>(f: F): F {
	return makeCached(f, false);
}

/**
 * Wraps a function call, the returned value is cached until the strategy is reloaded
 * @param f - The function to wrap
 * @returns The wrapped function
 */
export function forever <F extends Function>(f: F): F {
	return makeCached(f, true);
}

/** Clears the value cache for the current frame */
export function resetFrame() {
	for (let obj of cleanup) {
		obj();
	}
}

