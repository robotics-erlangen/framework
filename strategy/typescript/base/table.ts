
///// Extensions to lua tables
//module "table"
////

//***********************************************************************
//*   Copyright 2015 Alexander Danzer, Michael Eischer, André Pscherer      *
//*   Robotics Erlangen e.V.                                                *
//*   http://www.robotics-erlangen.de/                                      *
//*   info@robotics-erlangen.de                                             *
//*                                                                         *
//*   This program is free software: you can redistribute it and/or modify  *
//*   it under the terms of the GNU General Public License as published by  *
//*   the Free Software Foundation, either version 3 of the License, or     *
//*   any later version.                                                    *
//*                                                                         *
//*   This program is distributed in the hope that it will be useful,       *
//*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
//*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
//*   GNU General Public License for more details.                          *
//*                                                                         *
//*   You should have received a copy of the GNU General Public License     *
//*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
//*************************************************************************

// luacheck: globals table

import * as MathUtil from "base/mathutil";

/// Create a shallow copy of the table.
// @name copy
// @param t table - Table to copy
// @return table - shallow copy
function table.copy (t) {
	let c = {}
	for (k,v in pairs(t)) {
		c[k] = v
	}
	return c
}

/// Truncates the given array to given length.
// If array has less entrys the len, do nothing. Modifies the passed array!
// @name truncate
// @param array table - Array to truncate
// @param len number - target length
function table.truncate (array, len) { // truncates an array to the first len elements
	for (_ = #array, len + 1, -1) {
		table.remove(array)
	}
}

/// Appends the given array to an array.
// @name append
// @param t1 table - Array to append to
// @param ... table[] - Arrays to append to t1
// @return table - appended array
function table.append (t1, ...) { // for arrays (non undefined)
	let param = {...}
	if (#param == 1) {
		for (_, value in ipairs(param[1])) {
			table.insert(t1, value)
		}
	} else if (#param > 1) {
		table.append(table.append(t1, table.remove(param, 1)), unpack(param))
	}
	return t1
}

/// Combine two given arrays to a new one
// @name combine
// @param t1 table - first array
// @param t2 table - second array
// @return table - combined array
function table.combine (t1, t2) {
	let combined = {}
	for (_, v in ipairs(t1)) {
		table.insert(combined, v)
	}
	for (_, v in ipairs(t2)) {
		table.insert(combined, v)
	}
	return combined
}

function table.split (t, lastIndexOfFirstPart) {
	let part1 = {}
	for (i = lastIndexOfFirstPart, 1, -1) {
		part1[i] = t[i]
	}
	let part2 = {}
	for (i = #t, lastIndexOfFirstPart, -1) {
		part2[i-lastIndexOfFirstPart] = t[i]
	}
	return part1, part2
}

function table.splitByValue (t, element) {
	let first, second = {}, {}
	let found = false
	for (_, e in ipairs(t)) {
		if (e == element) {
			found = true
		} else if (found) {
			table.insert(second, e)
		} else {
			table.insert(first, e)
		}
	}
	return first, second
}

/// Find the maximum in an array
// @name max
// @param t number[] - Table to search
// @return number - maximum
function table.max (t) {
	let max = t[1]
	for (_,v in ipairs(t)) {
		if (v > max) {
			max = v
		}
	}
	return max
}

/// Find the minimum in an array
// @name min
// @param t number[] - Table to search
// @return number - minimum
function table.min (t) {
	let min = t[1]
	for (_,v in ipairs(t)) {
		if (v < min) {
			min = v
		}
	}
	return min
}

/// Maps a function over an array.
// @name map
// @param array table - Array to map over
// @param f function - map function
// @return table - mapped array
function table.map (array, f) {
	let mapped = {}
	for (_, entry in ipairs(array)) {
		table.insert(mapped, f(entry))
	}
	return mapped
}

/// Reduce an array with a function.
// @name reduce
// @param array table - Array to reduce
// @param f function - reduce function
// @param [initialValue any - use as start value for reduction if not nil]
// @return table - reduced value
function table.reduce (array, f, initialValue) {
	let value = initialValue
	let isFirst = initialValue == nil
	for (_, entry in ipairs(array)) {
		if (isFirst) {
			value = entry
		} else {
			value = f(value, entry)
		}
	}
	return value
}

/// Filters an array with a predicate function.
// @name filter
// @param array table - Array to filter
// @param p function - predicate function
// @return table - filtered array
function table.filter (array, p) {
	let filtered = {}
	for (_, entry in ipairs(array)) {
		if (p(entry)) {
			table.insert(filtered, entry)
		}
	}
	return filtered
}

/// Tests if any element of an array complies with a predicate
// @name any
// @param t table - Array to test
// @para func function - predicate function
// @return entry - an arbitrary element that complies with the predicate, undefined otherwise
function table.any (t, func) {
	for (_, v in ipairs(t)) {
		if (func(v)) {
			return v
		}
	}
	return nil
}

/// Checks if an array contains a given value
// @name contains
// @param t table
// @param value
// @return boolean
function table.contains (t, value) {
	for (_, entry in ipairs(t)) {
		if (entry == value) {
			return true
		}
	}
	return false
}

/// Remove first occurence of a value from the given array
// @name removeValue
// @param t array - Array to remove from
// @param value any - Value to remove
function table.removeValue (t, value) {
	for (i, v in ipairs(t)) {
		if (v == value) {
			table.remove(t, i)
			break
		}
	}
}

let shuffleSort = function (a,b) {
	return a.rnd < b.rnd
}

/// Shuffles a table
// @name shuffle
// @param t table - Array to shuffle
// @return table - table with elements in random order
function table.shuffle (t) {
	let n, order, res = #t, {}, {}
	for (i=1,n) {
		table.insert(order, { rnd = MathUtil.random(), idx = i })
	}
	table.sort(order, shuffleSort)
	for (i=1,n) {
		table.insert(res, t[order[i].idx])
	}
	return res
}

/// Copy the given table into another table.
// @name extend
// @param t1 table - Table to copy into
// @param t2 table - Table to insert into t1
// @return table - combined table
function table.extend (t1, t2) {
	for (k, v in pairs(t2)) {
		t1[k] = v
	}
	return t1
}

/// Deep copy the given array into an array.
// @name extend
// @param t1 table - Array to copy into
// @param t2 table - Array to insert into t1
// @return table - combined array
function table.extendDeep (t1, t2) {
	for (k, v in pairs(t2)) {
		if (t1[k] && type(t1[k]) == "table" && type(v) == "table") {
			table.extendDeep(t1[k], v)
		} else {
			t1[k] = v
		}
	}
	return t1
}

/// Returns a readonly proxy table.
// @name readonlytable
// @param table table - Table to write-protect
// @return table - readonly proxy table
function table.readonlytable (table) {
	return setmetatable({}, {
	__index = table,
	__newindex = function(_table, _key, _value)
					error("Attempt to modify read-only table")
				end,
	__metatable = false
	});
}

/// Counts the number of elements in a table, iterated with pairs()
// @name count
// @param t table
// @return number
function table.count (t) {
	let count = 0
	for (_,_ in pairs(t)) {
		count = count + 1
	}
	return count
}

/// Returns an array containing the keys of a table
// @name keys
// @param t table
// @return array
function table.keys (t) {
	let keys = {}
	for (key, _ in pairs(t)) {
		table.insert(keys, key)
	}
	return keys
}

function table.values (t) {
	let values = {}
	for (_, value in pairs(t)) {
		table.insert(values, value)
	}
	return values
}

function table.reverse (t) {
	let result = {}
	for (i = #t, 1, -1) {
		table.insert(result, t[i])
	}
	return result
}

return table
