--[[
--- Extensions to lua math functions
module "math"
]]--

--- Limits value to interval [min, max].
-- @name bound
-- @param min number - lower bound of interval
-- @param par number - value to limit to interval
-- @param max number - upper bound of interval
-- @return number - par limited to interval [min, max]
function math.bound(min, par, max)
	if par < min then return min end
	if par > max then return max end
	return par
end

--- Rounds value towards dest.
-- The function provides a helper to implement hysteresis for certain functions.
-- If the value is in the interval [dest-0.5-spacing/2, dest+0.5+spacing/2] then dest is returned.
-- Otherwise it behaves like math.round.
-- @name roundTowards
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

--- Round value to idp digits
-- @usage round(1.23, 1) -- 1.2
-- @name round
-- @param val number
-- @param digits number - digits to keep after decimal dot
-- @return number - rounded value
function math.round(val, digits)
	local fac = 10^(digits or 0)
	return math.floor(val * fac + 0.5) / fac
end

return math
