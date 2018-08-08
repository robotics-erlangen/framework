--[[
--- Provides a caching mechanism for function calls
module "Cache"
]]--

--[[***********************************************************************
*   Copyright 2015 Michael Eischer                                        *
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

local Cache = {}

local cleanup = {}
local nilObj = {}

local function getFromCache(cached, params)
	local pcount = table.maxn(params)
	params[0] = pcount

	local entry = cached
	for i = 0, pcount do
		local param = params[i]
		if param == nil then
			param = nilObj
		end
		entry = entry[param]
		if entry == nil then
			return nil
		end
	end
	return entry
end

local function setInCache(cached, params, result)
	local pcount = table.maxn(params)
	params[0] = pcount

	local entry = cached
	for i = 0, pcount do
		local param = params[i]
		-- nil can't be used as array index
		if param == nil then
			param = nilObj
		end
		if i == pcount then
			entry[param] = result
			return
		elseif entry[param] == nil then
			local newEntry = {}
			setmetatable(newEntry, {__mode = "k"})
			entry[param] = newEntry
		end
		entry = entry[param]
	end
end

local function makeCached(f, keepForever)
	local cached = {}
	if not keepForever then
		table.insert(cleanup,
			function()
				cached = {}
			end
		)
	end
	return function(...)
		local result = getFromCache(cached, {...})
		if not result then
			result = { f(...) }
			setInCache(cached, {...}, result)
		end
		return unpack(result)
	end
end

--- Wraps a function call, the returned value is cached for this strategy run
-- @name forFrame
-- @param f function - function to wrap
-- @return function - wrapped function
function Cache.forFrame(f)
	return makeCached(f, false)
end

--- Wraps a function call, the returned value is cached until the strategy is reloaded
-- @name forever
-- @param f function - function to wrap
-- @return function - wrapped function
function Cache.forever(f)
	return makeCached(f, true)
end

--- Clears the value cache for the current frame
-- @name resetFrame
function Cache.resetFrame()
	for i = 1, #cleanup do
		cleanup[i]()
	end
end

return Cache
