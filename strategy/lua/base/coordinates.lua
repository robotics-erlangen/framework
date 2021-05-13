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

local function invertCoordinates(data)
	local dtype = type(data)
	if dtype == "number" then
		if data > math.pi then
			return data - math.pi
		else
			return data + math.pi
		end
	elseif dtype == "nil" then
		error("nil isn't a coordinate")
	else
		return Vector(-data.x, -data.y, data:isReadonly())
	end
end

local function invertList(data)
	local inverted = {}
	for k,v in ipairs(data) do
		inverted[k] = invertCoordinates(v)
	end
	return inverted
end

local function passthrough(data)
	return data
end

local function blueToVision(data)
	local dtype = type(data)
	if dtype == "number" then
		-- Rotate 270 degrees
		data = data - 1.5 * math.pi
		if data < 0 then
			data = data + 2 * math.pi
		end
		return data
	elseif dtype == "nil" then
		error("nil isn't a coordinate")
	else
		data = 1000 * data
		return Vector(-data.y, data.x, data:isReadonly())
	end
end

local function yellowToVision(data)
	local dtype = type(data)
	if dtype == "number" then
		-- Rotate 90 degrees
		data = data - 0.5 * math.pi
		if data < 0 then
			data = data + 2 * math.pi
		end
		return data
	elseif dtype == "nil" then
		error("nil isn't a coordinate")
	else
		data = 1000 * data
		return Vector(data.y, -data.x, data:isReadonly())
	end
end

function Coordinates._setIsBlue(teamIsBlue)
	if teamIsBlue then
		Coordinates.toGlobal = invertCoordinates
		Coordinates.toLocal = invertCoordinates
		Coordinates.listToGlobal = invertList
		Coordinates.toVision = blueToVision
	else
		Coordinates.toGlobal = passthrough
		Coordinates.toLocal = passthrough
		Coordinates.listToGlobal = passthrough
		Coordinates.toVision = yellowToVision
	end
end

return Coordinates
