/**
 * @module debug
 * Provides functions to set values on the debug tree
 */

/**************************************************************************
*   Copyright 2018 Michael Eischer, Philipp Nordhus, Andreas Wendler      *
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
*   along with this program.  if not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

let addDebug: Function = amun.addDebug;
import { log } from "base/amun";

let debugStack: string[] = [""];

let joinCache: { [prefix: string]: { [name: string]: string } } = {};

function prefixName(name?: string): string {
	let prefix = debugStack[debugStack.length - 1];
	if (name == undefined) {
		return prefix;
	} else if (prefix.length === 0) {
		return name;
	}

	// caching to avoid joining the debug keys over and over
	if (joinCache[prefix] != undefined && joinCache[prefix][name] != undefined) {
		return joinCache[prefix][name];
	}
	let joined = `${prefix}/${name}`;
	if (joinCache[prefix] == undefined) {
		joinCache[prefix] = {};
	}
	joinCache[prefix][name] = joined;
	return joined;
}

/**
 * Pushes a new key on the debug stack
 * @param name - Name of the new subtree
 * @param value - Value for the subtree header
 */
export function push(name: string, value?: string) {
	debugStack.push(prefixName(name));
	if (value != undefined) {
		set(undefined, value);
	}
}

/**
 * Pushes a root key on the debug stack.
 * @param name - Name of the new root tree or undefined to push root
 */
export function pushtop(name?: string) {
	if (!name) {
		debugStack.push("");
	} else {
		debugStack.push(name);
	}
}

/** Pops last key from the debug stack */
export function pop() {
	if (debugStack.length > 0) {
		debugStack.pop();
	}
}

/**
 * Get extra params for debug set.
 * This can be used to keep the table # stable across calls to debug.set
 * Usage: let extraParams = getInitialExtraParams()
 * debug.set(key, value, unpack(extraParams))
 */
export function getInitialExtraParams(): object {
	let visited = new Map<object, string>();
	let tableCounter = [0];
	return [visited, tableCounter];
}

/**
 * Sets value for the given name.
 * if (value is undefined store it as text
 * For the special value undefined the value is set for the current key
 * @param name - Name of the value
 * @param value - Value to set
 */
export function set(name: string | undefined, value: any, visited: Map<object, string> = new Map(), tableCounter?: number[]) {
	// visited and tableCounter must be compatible with getInitialExtraParams

	let result: any;
	if (typeof(value) === "object") {
		if (visited.get(value)) {
			set(name, `${visited.get(value)} (duplicate)`);
			return;
		}
		let suffix = "";
		if (tableCounter) {
			suffix = ` [# ${tableCounter[0]} ]`;
			tableCounter[0] = tableCounter[0] + 1;
		}
		visited.set(value, suffix);

		// custom toString for Vector, Robot
		if (value._toString) {
			let origValue = value;
			result = value._toString() + suffix;
			visited.set(origValue, result);
		} else {
			let friendlyName;
			let isMap = false;
			if (value.constructor != undefined && Object.keys(value).length === 0) {
				if (value instanceof Map) {
					isMap = true;
					friendlyName = "Map";
				} else {
					friendlyName = `empty object (${value.constructor.name})`;
				}
			} else if (value.constructor != undefined) {
				friendlyName = value.constructor.name;
			} else {
				friendlyName = "";
			}

			push(String(name));
			friendlyName = friendlyName + suffix;
			set(undefined, friendlyName);
			visited.set(value, friendlyName);

			if (isMap) {
				let counter = 0;
				for (let [k, v] of value.entries()) {
					push(`map entry ${counter++}`);
					set("key", k, visited, tableCounter);
					set("value", v, visited, tableCounter);
					pop();
				}
			} else {
				for (let k in value) {
					let v = value[k];
					set(String(k), v, visited, tableCounter);
				}
			}
			pop();
			return;
		}
	} else if (typeof(value) === "function") {
		result = `function ${value.name}`;
	} else {
		result = value;
	}

	addDebug(prefixName(name), result);
}

/**
 * Wrap a function call with a push/pop. This ensures that, no matter where
 * fn returns, the debug tree is properly balanced.
 * @param key - The key to push onto the debug tree
 * @param fn - The function to wrap
 * @returns A wrapper function which will push and pop properly
 */
export function wrap<T extends Function>(key: string, fn: T): T {
	// must not be an arrow-function
	// otherwise the returned function will will have the local this as this
	const newFn = function(this: any) {
		push(key);
		// eslint-disable-next-line no-invalid-this
		const ret = fn.apply(this, arguments);
		pop();
		return ret;
	};
	// copy over [[prototype]] and own fields
	// note that this should rarely be needed
	// who changes the prototype of a function anyways?
	const fnProto = Object.getPrototypeOf(fn);
	if (Object.getPrototypeOf(newFn) !== fnProto) {
		Object.setPrototypeOf(newFn, fnProto);
	}
	Object.assign(newFn, fn);
	return newFn as any;
}

/** Clears the debug stack */
export function resetStack() {
	if (debugStack.length !== 1 || debugStack[0] !== "") {
		log("Unbalanced push/pop on debug stack");
		for (let v of debugStack) {
			log(v);
		}
	}
	debugStack = [""];
}

