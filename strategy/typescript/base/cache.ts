//[[
/// Provides a caching mechanism for function calls
module "Cache"
]]//

//[[***********************************************************************
*   Copyright 2015 Michael Eischer                                        *
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

let Cache = {}

let cleanup = {}
let nilObj = {}

let getFromCache = function (cached, params) {
	let pcount = table.maxn(params)
	params[0] = pcount

	let entry = cached
	for (i = 0, pcount) {
		let param = params[i]
		if (param == nil) {
			param = nilObj
		}
		entry = entry[param]
		if (entry == nil) {
			return nil
		}
	}
	return entry
}

let setInCache = function (cached, params, result) {
	let pcount = table.maxn(params)
	params[0] = pcount

	let entry = cached
	for (i = 0, pcount) {
		let param = params[i]
		// nil can't be used as array index
		if (param == nil) {
			param = nilObj
		}
		if (i == pcount) {
			entry[param] = result
			return
		} else if (entry[param] == nil) {
			let newEntry = {}
			setmetatable(newEntry, {__mode = "k"})
			entry[param] = newEntry
		}
		entry = entry[param]
	}
}

let makeCached = function (f, keepForever) {
	let cached = {}
	if (not keepForever) {
		table.insert(cleanup,
			function()
				cached = {}
			}
		)
	}
	return function(...)
		let result = getFromCache(cached, {...})
		if (not result) {
			result = { f(...) }
			setInCache(cached, {...}, result)
		}
		return unpack(result)
	}
}

/// Wraps a function call, the returned value is cached for this strategy run
// @name forFrame
// @param f function - function to wrap
// @return function - wrapped function
function Cache.forFrame (f) {
	return makeCached(f, false)
}

/// Wraps a function call, the returned value is cached until the strategy is reloaded
// @name forever
// @param f function - function to wrap
// @return function - wrapped function
function Cache.forever (f) {
	return makeCached(f, true)
}

/// Clears the value cache for the current frame
// @name resetFrame
function Cache.resetFrame()
	for (i = 1, #cleanup) {
		cleanup[i]()
	}
}

return Cache
