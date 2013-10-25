local GlobalsChecker = {}

local validGlobals = {
	amun = true,
	log = true, -- amun and log musn't be reported, otherwise the checker will crash
	path = true,
	Vector = true,
	Settings = true,
	mime = true, -- allow loading modules required for remote debugging
	socket = true,
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
	__index = function (t, k)
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
-- @param extraGlobals table<names, any> - Names of additional allowed globals
function GlobalsChecker.enable(extraGlobals)
	isEnabled = true
	extraGlobals = extraGlobals or {}
	for k, v in pairs(extraGlobals) do
		validGlobals[k] = v
	end 
end

-- To be called directly after base/amun is loaded
function GlobalsChecker._init()
	if not isEnabled then
		return
	end

	if amun.isDebug then
		globalsWarn = error -- writing globals is an error in debug mode
	else
		globalsWarn = log -- just log illegal writes to globals when not in debug mode
	end
	setmetatable(_G, globalsChecker)
end

return GlobalsChecker
