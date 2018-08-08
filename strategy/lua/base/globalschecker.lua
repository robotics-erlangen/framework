--[[
--- Shows warnings if global variables are created instead of local ones
module "GlobalsChecker"
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

local GlobalsChecker = {}

local validGlobals = {
	amun = true,
	log = true, -- amun and log musn't be reported, otherwise the checker will crash
	Vector = true,
	Class = true,
}

local globalsWarn -- if amun.isDebug is true then this is the function "error", otherwise it's "log"
local reportedReads = {}

local globalsChecker = {
	-- there should be only a fixed set of globals, thus this causes no performance hit
	__newindex = function (t, k, v)
		if not validGlobals[k] then
			-- error while debug enabled, otherwise just a warning
			globalsWarn("Setting global " .. tostring(k) .. " to value " .. tostring(v))
		end
		rawset(t, k, v)
	end,
	-- check for reading undefined globals, only called for unknown globals
	__index = function (_t, k)
		-- report a read global only once to prevent log spam
		if reportedReads[k] then
			return
		end
		globalsWarn("Reading undefined global " .. tostring(k))
		reportedReads[k] = true
	end
}


local isEnabled = false

--- Enables the globals checker, MUST be the FIRST function called in the init script!
-- @name enable
-- @param extraGlobals table<names, any> - Names of additional allowed globals
function GlobalsChecker.enable(extraGlobals)
	isEnabled = true
	extraGlobals = extraGlobals or {}
	for k, v in pairs(extraGlobals) do
		validGlobals[k] = v
	end
end

-- Called directly after base/amun is loaded
function GlobalsChecker._init(isDebug)
	if not isEnabled then
		return
	end

	if isDebug then
		globalsWarn = error -- writing globals is an error in debug mode
	else
		globalsWarn = log -- just log illegal writes to globals when not in debug mode
	end
	setmetatable(_G, globalsChecker)
end

return GlobalsChecker
