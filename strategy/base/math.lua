--[[
--- Extensions to lua math functions
module "math"
]]--

require "amunMath"

--- solves up to quartic equations
-- The equation is in the form  a + b*x + c*x^2 + d*x^3 + e*x^4 = 0
-- Left out parameters are considered to be 0
-- The C-function chooses the solver for the lowest polynomial degree possible
-- @class function
-- @name math.solveEquation
-- @param a number - a parameter
-- @param b number - b parameter
-- @param c number - c parameter
-- @param d number - d parameter
-- @param e number - e parameter
-- @return number, number, number, number -- the solutions, number is nil when no solution (if there are for example 2 solutions, they will be in the first two return variables)

--[[
separator for luadoc]]--

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

--- Rounds value upwards.
-- The function provides a helper to implement hysteresis for certain functions.
-- Rounds the suffixes in [0.5 - spacing, 1] upwards
-- @name roundUpwards
-- @param val number - value to round
-- @param spacing number - tolerance for rounding up
function math.roundUpwards(val, spacing)
	if val + spacing + 0.5 >= math.ceil(val) then
		return math.ceil(val)
	else
		return math.floor(val)
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


--- Solves a*t + b for t
--@name solveLin
--@param a number
--@param b number
--@return [number]
function math.solveLin(a, b)
	if a == 0 then
		return 
	end
	return -b/a
end


--- Solves a*t^2 + b*t + c for t
-- @name solveSq
-- @param a number
-- @param b number
-- @param c number
-- @return [number - smallest positive solution or largest
-- @return [number]]
function math.solveSq(a, b, c)
	if a == 0 then
		return math.solveLin(b, c)
	end
	
	local det = b*b - 4*a*c
	if det < 0 then
		return
	elseif det == 0 then
		return -b/(2*a)
	end
	det = math.sqrt(det)
	local t2 = (-b-math.sign(b)*det)/(2*a)
	local t1 = c/(a*t2)
	local min = math.min(t1, t2)

	-- if both are >= 0 return smallest
	-- if only one is >= 0 the it's the larger value of both
	-- and the smallest positive solution
	if (min >= 0 and t1 < t2) or (min < 0 and t1 >= t2) then
		return t1, t2
	else
		return t2, t1
	end
end

--- "Calculates" the signum of a number
-- @name sign
-- @param number number
-- @return number - 1 for postive number, -1 for negative number, 0 for 0
function math.sign(number)
	if number > 0 then
		return 1
	elseif number < 0 then
		return -1
	else
		return 0
	end
end

return math
