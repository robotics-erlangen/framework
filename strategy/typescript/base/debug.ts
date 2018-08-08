--[[
--- Provides functions to set values on the debug tree
module "debug"
]]--

--[[***********************************************************************
*   Copyright 2017 Michael Eischer, Philipp Nordhus                       *
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

local luaDebug = debug
local debug = {}

local amun = amun
local Class = require "../base/class"


local debugStack = { "" }

local joinCache = {}

local function prefixName(name)
	local prefix = debugStack[#debugStack]
	if name == nil then
		return prefix
	elseif #prefix == 0 then
		return name
	end

	-- caching to avoid joining the debug keys over and over
	if joinCache[prefix] and joinCache[prefix][name] then
		return joinCache[prefix][name]
	end
	local joined = prefix .. "/" .. name
	if not joinCache[prefix] then
		joinCache[prefix] = {}
	end
	joinCache[prefix][name] = joined
	return joined
end

--- Pushes a new key on the debug stack.
-- @name push
-- @param name string - Name of the new subtree
-- @param [value string - Value for the subtree header]
function debug.push(name, value)
	table.insert(debugStack, prefixName(name))
	if value then
		debug.set(nil, value)
	end
end

--- Pushes a root key on the debug stack.
-- @name pushtop
-- @param name string - Name of the new root tree or nil to push root
function debug.pushtop(name)
	table.insert(debugStack, name or "")
end

--- Pops last key from the debug stack.
-- @name pop
function debug.pop()
	if #debugStack > 1 then
		table.remove(debugStack)
	end
end


--- Get extra params for debug.set.
-- This can be used to keep the table # stable across calls to debug.set
-- Usage: local extraParams = debug.getInitialExtraParams()
-- debug.set(key, value, unpack(extraParams))
-- @name getInitialExtraParams
-- @return Initial extra params
function debug.getInitialExtraParams()
	local visited = {}
	local tableCounter = { 0 }
	return { visited, tableCounter }
end


--- Sets value for the given name.
-- If value is nil store it as text
-- For the special value nil the value is set for the current key
-- @name set
-- @param name string - Name of the value
-- @param value string - Value to set
function debug.set(name, value, visited, tableCounter)
	-- must be compatible with getInitialExtraParams
	visited = visited or {}
	tableCounter = tableCounter

	if type(value) == "table" then
		if visited[value] then
			debug.set(name, visited[value] .. " (duplicate)")
			return
		end
		local suffix = ""
		if tableCounter then
			suffix = " [#"..tostring(tableCounter[1]).."]"
			tableCounter[1] = tableCounter[1] + 1
		end
		visited[value] = suffix

		if rawget(getmetatable(value) or {}, "__tostring") then
			local origValue = value
			value = tostring(value)..suffix
			visited[origValue] = value
		else
			local class = Class.toClass(value, true)
			local hasValues = next(value) ~= nil

			local friendlyName
			if class then
				friendlyName = Class.name(class)
			elseif not hasValues then
				friendlyName = "empty table"
			else
				friendlyName = ""
			end

			debug.push(tostring(name))
			friendlyName = friendlyName..suffix
			debug.set(nil, friendlyName)
			visited[value] = friendlyName

			local mt = tableCounter and luaDebug and luaDebug.getmetatable(value)
			if mt then
				debug.set("[__metatable]", mt, visited, tableCounter)
			end

			local entryCounter = 1
			for k, v in pairs(value) do
				if type(k) == "table" then
					local baseName = "[entry-"..tostring(entryCounter).."]"
					debug.set(baseName.."/key", k, visited, tableCounter)
					debug.set(baseName.."/value", v, visited, tableCounter)
					debug.set(baseName, "MapEntry")
					entryCounter = entryCounter + 1
				else
					debug.set(tostring(k), v, visited, tableCounter)
				end
			end
			debug.pop()
			return
		end
	elseif type(value) == "userdata" or type(value) == "cdata"
			or type(value) == "function" or type(value) == "thread" then
		value = tostring(value)
	end

	amun.addDebug(prefixName(name), value)
end

--- Clears the debug stack
-- @name resetStack
function debug.resetStack()
	if #debugStack ~= 1 or debugStack[1] ~= "" then
		log("Unbalanced push/pop on debug stack")
		for _,v in ipairs(debugStack) do
			log(v)
		end
	end
	debugStack = { "" }
end

return debug
