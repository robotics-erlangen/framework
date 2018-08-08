--[[
--- Class to add new Entrypoints
module "Entrypoints"
]]--

--[[***********************************************************************
*   Copyright 2015 Michael Eischer, Christian Lobmeier                    *
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

local Entrypoints = {}

local entries = {}

--- Adds an entrypoint
-- @name add
-- @param name string - Entrypoint name parts are separated with '/'
-- @param func function - Function to call for this entrypoint
function Entrypoints.add(name, func)
	if entries[name] ~= nil then
		error("An entrypoint with name "..tostring(name).." already exists")
	end
	entries[name] = func
end

--- Returns the entrypoint list.
-- The functions are wrapped using the wrapper function which should
-- call the basic runtime functions
-- @return table<string, function> - Entrypoints table for passing to ra
function Entrypoints.get(wrapper)
	local wrapped = {}
	for name, func in pairs(entries) do
		wrapped[name] = wrapper(func)
	end
	return wrapped
end

return Entrypoints
