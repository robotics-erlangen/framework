--[[
--- Functions to convert from global to strategy local coordinates and back.
-- Only use to convert values from or for amun!
module "Coordinates"
]]--
local Coordinates = {}

--- Converts global coordinates from amun to strategy local coordinates
-- @class function
-- @name toLocal
-- @param data Vector/number - vector or angle to convert
-- @return Vector/number

--[[
separator for luadoc]]--

--- Converts strategy local coordinates to global coordinates for amun
-- @class function
-- @name toGlobal
-- @param data Vector/number - vector or angle to convert
-- @return Vector/number

--[[
separator for luadoc]]--

--- Does toGlobal conversion for a list
-- @class function
-- @name listToGlobal
-- @param data (Vector/number)[] - list to map
-- @return (Vector/number)[]

--[[
separator for luadoc]]--

local teamIsBlue = amun.isBlue()

if teamIsBlue then
	Coordinates.toGlobal = function(data)
		assert(nil ~= data, "nil isn't a coordiante")
		if type(data) == "number" then
			if data > math.pi then
				return data - math.pi
			else
				return data + math.pi
			end
		else
			return Vector.create(-data.x, -data.y)
		end
	end
	Coordinates.toLocal = Coordinates.toGlobal

	Coordinates.listToGlobal = function(data)
		local inverted = {}
		for k,v in ipairs(data) do
			inverted[k] = Coordinates.toGlobal(v)
		end
		return inverted
	end
else
	Coordinates.toGlobal = function (data)
		return data
	end
	Coordinates.toLocal = Coordinates.toGlobal
	Coordinates.listToGlobal = Coordinates.toGlobal
end

return Coordinates
