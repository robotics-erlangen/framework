--[[
--- Extensions to lua tables
module "table"
]]--

--- Create a shallow copy of the table.
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
-- @param array table - Array to truncate
-- @param len number - target length
function table.truncate(array, len) -- truncates an array to the first len elements
	for i = #array, len + 1, -1 do
		table.remove(array, i)
	end
end

--- Appends the given array to an array.
-- @param t1 table - Array to append to
-- @param ... table[] - Array to append to t1
-- @return table - appended array
function table.append(t1, ...) -- for arrays (non nil)
	local param = {...}
	if #param == 1 then
		for _, value in pairs(param[1]) do
			table.insert(t1, value)
		end
	elseif #param > 1 then
		table.append(append(t1, table.remove(param, 1)), unpack(param))
	end
	return t1
end

function table.extend(t1, t2)
	for k, v in pairs(t2) do
		t1[k] = v
	end
	return t1
end

function table.max(t)
	local max = t[1]
	for _,v in ipairs(t) do
		if v > max then
			max = v
		end
	end
	return max
end

function table.min(t)
	local min = t[1]
	for _,v in ipairs(t) do
		if v < min then
			min = v
		end
	end
	return min
end

return table
