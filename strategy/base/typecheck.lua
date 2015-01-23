--[[ 
--- Typecheck helper
-- module "Typecheck"
]]--

--[[***********************************************************************
*   Copyright 2014 Alexander Danzer                                       *
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


local Class = require "../base/class"

--- tests a given value for a type
-- if the value is not of the requested Type, the function crashes with an error
-- @param value - the value to test
-- @param requestedType - the type value should have
-- @return value - if test was successfull
return function(value, requestedType)
	local tval = type(value)
	if type(requestedType) == "string" then
		if tval ~= requestedType then
			error("Expected type " .. requestedType .. " got " .. tval)
		end
	elseif type(requestedType) == "table" and Class.toClass(requestedType, true) then
		if tval ~= "table" then
			error("Expected class "..Class.name(requestedType).. " got type " .. tval)
		end
		if not Class.toClass(value, true) then
			if Class.instanceOf(requestedType, MessageBase) then
				value = requestedType.create(value)
			else
				error("Expected class "..Class.name(requestedType).. " got type " .. tval)
			end
		end
		if not Class.instanceOf(value, requestedType) then
				error("Expected class "..Class.name(requestedType).." got class "..Class.name(value))
		end
	else
		error("Can't handle requestedType")
	end
	return value
end
