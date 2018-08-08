--[[
--- Extensions to lua tables
module "table"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, André Pscherer      *
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
*************************************************************************]]

-- luacheck: globals table

--- Create a shallow copy of the table.
-- @name copy
-- @param t table - Table to copy
-- @return table - shallow copy
function table.copy(t)
	local c = {}
	for k,v in pairs(t) do
		c[k] = v
	end
	return c
end

--- Truncates the given array to given length.
-- If array has less entrys the len, do nothing. Modifies the passed array!
-- @name truncate
-- @param array table - Array to truncate
-- @param len number - target length
function table.truncate(array, len) -- truncates an array to the first len elements
	for _ = #array, len + 1, -1 do
		table.remove(array)
	end
end

--- Appends the given array to an array.
-- @name append
-- @param t1 table - Array to append to
-- @param ... table[] - Arrays to append to t1
-- @return table - appended array
function table.append(t1, ...) -- for arrays (non nil)
	local param = {...}
	if #param == 1 then
		for _, value in ipairs(param[1]) do
			table.insert(t1, value)
		end
	elseif #param > 1 then
		table.append(table.append(t1, table.remove(param, 1)), unpack(param))
	end
	return t1
end

--- Combine two given arrays to a new one
-- @name combine
-- @param t1 table - first array
-- @param t2 table - second array
-- @return table - combined array
function table.combine(t1, t2)
	local combined = {}
	for _, v in ipairs(t1) do
		table.insert(combined, v)
	end
	for _, v in ipairs(t2) do
		table.insert(combined, v)
	end
	return combined
end

function table.split(t, lastIndexOfFirstPart)
	local part1 = {}
	for i = lastIndexOfFirstPart, 1, -1 do
		part1[i] = t[i]
	end
	local part2 = {}
	for i = #t, lastIndexOfFirstPart, -1 do
		part2[i-lastIndexOfFirstPart] = t[i]
	end
	return part1, part2
end

function table.splitByValue(t, element)
	local first, second = {}, {}
	local found = false
	for _, e in ipairs(t) do
		if e == element then
			found = true
		elseif found then
			table.insert(second, e)
		else
			table.insert(first, e)
		end
	end
	return first, second
end

--- Find the maximum in an array
-- @name max
-- @param t number[] - Table to search
-- @return number - maximum
function table.max(t)
	local max = t[1]
	for _,v in ipairs(t) do
		if v > max then
			max = v
		end
	end
	return max
end

--- Find the minimum in an array
-- @name min
-- @param t number[] - Table to search
-- @return number - minimum
function table.min(t)
	local min = t[1]
	for _,v in ipairs(t) do
		if v < min then
			min = v
		end
	end
	return min
end

--- Maps a function over an array.
-- @name map
-- @param array table - Array to map over
-- @param f function - map function
-- @return table - mapped array
function table.map(array, f)
	local mapped = {}
	for _, entry in ipairs(array) do
		table.insert(mapped, f(entry))
	end
	return mapped
end

--- Reduce an array with a function.
-- @name reduce
-- @param array table - Array to reduce
-- @param f function - reduce function
-- @param [initialValue any - use as start value for reduction if not nil]
-- @return table - reduced value
function table.reduce(array, f, initialValue)
	local value = initialValue
	local isFirst = initialValue == nil
	for _, entry in ipairs(array) do
		if isFirst then
			value = entry
		else
			value = f(value, entry)
		end
	end
	return value
end

--- Filters an array with a predicate function.
-- @name filter
-- @param array table - Array to filter
-- @param p function - predicate function
-- @return table - filtered array
function table.filter(array, p)
	local filtered = {}
	for _, entry in ipairs(array) do
		if p(entry) then
			table.insert(filtered, entry)
		end
	end
	return filtered
end

--- Tests if any element of an array complies with a predicate
-- @name any
-- @param t table - Array to test
-- @para func function - predicate function
-- @return entry - an arbitrary element that complies with the predicate, nil otherwise
function table.any(t, func)
	for _, v in ipairs(t) do
		if func(v) then
			return v
		end
	end
	return nil
end

--- Checks if an array contains a given value
-- @name contains
-- @param t table
-- @param value
-- @return boolean
function table.contains(t, value)
	for _, entry in ipairs(t) do
		if entry == value then
			return true
		end
	end
	return false
end

--- Remove first occurence of a value from the given array
-- @name removeValue
-- @param t array - Array to remove from
-- @param value any - Value to remove
function table.removeValue(t, value)
	for i, v in ipairs(t) do
		if v == value then
			table.remove(t, i)
			break
		end
	end
end

local function shuffleSort(a,b)
	return a.rnd < b.rnd
end

--- Shuffles a table
-- @name shuffle
-- @param t table - Array to shuffle
-- @return table - table with elements in random order
function table.shuffle(t)
	local n, order, res = #t, {}, {}
	for i=1,n do
		table.insert(order, { rnd = math.random(), idx = i })
	end
	table.sort(order, shuffleSort)
	for i=1,n do
		table.insert(res, t[order[i].idx])
	end
	return res
end

--- Copy the given table into another table.
-- @name extend
-- @param t1 table - Table to copy into
-- @param t2 table - Table to insert into t1
-- @return table - combined table
function table.extend(t1, t2)
	for k, v in pairs(t2) do
		t1[k] = v
	end
	return t1
end

--- Deep copy the given array into an array.
-- @name extend
-- @param t1 table - Array to copy into
-- @param t2 table - Array to insert into t1
-- @return table - combined array
function table.extendDeep(t1, t2)
	for k, v in pairs(t2) do
		if t1[k] and type(t1[k]) == "table" and type(v) == "table" then
			table.extendDeep(t1[k], v)
		else
			t1[k] = v
		end
	end
	return t1
end

--- Returns a readonly proxy table.
-- @name readonlytable
-- @param table table - Table to write-protect
-- @return table - readonly proxy table
function table.readonlytable(table)
	return setmetatable({}, {
	__index = table,
	__newindex = function(_table, _key, _value)
					error("Attempt to modify read-only table")
				end,
	__metatable = false
	});
end

--- Counts the number of elements in a table, iterated with pairs()
-- @name count
-- @param t table
-- @return number
function table.count(t)
	local count = 0
	for _,_ in pairs(t) do
		count = count + 1
	end
	return count
end

--- Returns an array containing the keys of a table
-- @name keys
-- @param t table
-- @return array
function table.keys(t)
	local keys = {}
	for key, _ in pairs(t) do
		table.insert(keys, key)
	end
	return keys
end

function table.values(t)
	local values = {}
	for _, value in pairs(t) do
		table.insert(values, value)
	end
	return values
end

function table.reverse(t)
	local result = {}
	for i = #t, 1, -1 do
		table.insert(result, t[i])
	end
	return result
end

return table
