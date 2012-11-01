--[[
--- Extensions to lua math functions
module "math"
]]--

--- Limits value to interval [min, max].
-- @param min number - lower bound of interval
-- @param par number - value to limit to interval
-- @param max number - upper bound of interval
-- @return number - par limited to interval [min, max]
function math.bound(min, par, max)
	if par < min then return min end
	if par > max then return max end
	return par
end

--- Rounds value towards dest
-- @param val number - value to round
-- @param dest number - value to round towards, must be an integer
-- @param spacing number - spacing between to numbers where we round towards dest
function math.roundTowards(val, dest, spacing)
	if val > dest + 0.5 + spacing/2 or val < dest - 0.5 - spacing/2 then
		return math.round(val)
	else
		return dest
	end
end

return math
