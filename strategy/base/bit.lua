--[[
--- Provides functions to emulate a bitfield
module "bit"
]]--
local bit = {}

--- Generate the flag for a given index
-- @name bit
-- @param p number - index
-- @return number - flag
function bit.bit(p)
	return 2 ^ (p - 1)  -- 1-based indexing
end

--- Checks if flag p is set on x
-- @name has
-- @param x number - bitfield
-- @param p number - flag to check for
-- @return bool - x has flag p
-- @usage Typical call: if bit.has(x, bit.bit(3)) then ...
function bit.has(x, p)
	return x % (p + p) >= p
end

--- Sets flag p for x
-- @name set
-- @param x number - bitfield
-- @param p number - flag to set
-- @return number - x with flag p set
function bit.set(x, p)
	return bit.has(x, p) and x or x + p
end

--- Clears flag p for x
-- @name clear
-- @param x number - bitfield
-- @param p number - flag to clear
-- @return number - x with flag p cleared
function bit.clear(x, p)
	return bit.has(x, p) and x - p or x
end

return bit
