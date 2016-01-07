--[[
--- Functions to convert from global to strategy local coordinates and back.
-- Only use to convert values from or for amun!
module "Coordinates"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
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
			return Vector(-data.x, -data.y, data:isReadonly())
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
