--[[
--- Provides functions to set values on the debug tree
module "debug"
]]--

--[[***********************************************************************
*   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

local debug = {}
local Class = require "../base/class"
local amun = amun

local debugStack = { "" }

local function joinName(prefix, name)
	if #prefix == 0 then
		return name
	elseif name == nil then
		return prefix
	end
	return prefix .. "/" .. name
end

local function prefixName(name)
	return joinName(debugStack[#debugStack], name)
end

--- Pushes a new key on the debug stack.
-- @name push
-- @param name string - Name of the new subtree
-- @param [value string - Value for the subtree header]
function debug.push(name, value)
	local current = debugStack[#debugStack]
	table.insert(debugStack, joinName(current, name))
	if value then
		debug.set(nil, value)
	end
end

--- Pushes a root key on the debug stack.
-- @name pushtop
-- @param name string - Name of the new root tree
function debug.pushtop(name)
	table.insert(debugStack, name)
end

--- Pops last key from the debug stack.
-- @name pop
function debug.pop()
	if #debugStack > 1 then
		table.remove(debugStack)
	end
end

--- Sets value for the given name.
-- If value is nil store it as text
-- For the special value nil the value is set for the current key
-- @name set
-- @param name string - Name of the value
-- @param value string - Value to set
function debug.set(name, value, visited)
	visited = visited or {}
	if type(value) == "table" then
		if visited[value] then
			debug.set(name, tostring(value))
			return
		end
		visited[value] = true
		
		if rawget(getmetatable(value) or {}, "__tostring") then
			value = tostring(value)
		else
			debug.push(tostring(name))
			local class = Class.toClass(value, true)
			if class then
				debug.set(nil, Class.name(class))
			end
			for k, v in pairs(value) do
				debug.set(k, v, visited)
			end
			debug.pop()
			return
		end
	elseif type(value) == "userdata" then
		value = tostring(value)
	end
	amun.addDebug(prefixName(name), value)
end

--- Clears the debug stack
-- @name resetStack
function debug.resetStack()
	if #debugStack ~= 1 then
		log("Unbalanced push/pop on debug stack")
		for k,v in pairs(debugStack) do
			log(v)
		end
	end
	debugStack = { "" }
end

return debug
