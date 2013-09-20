local validGlobals = {
	amun = true,
	log = true, -- amun and log musn't be reported, otherwise the checker will crash
	path = true,
	Vector = true,
	Settings = true,
	mime = true, -- allow loading modules required for remote debugging
	socket = true,
}

local globalsChecker = {
	-- there should be only a fixed set of globals, thus this causes no performance hit
	__newindex = function (t, k, v)
		if not validGlobals[k] then
			-- always show a warning
			log("Setting global " .. tostring(k) .. " to value " .. tostring(v))
			-- treat as error while debugging
			if amun and amun.isDebug then
				error("Unexpected global")
			end
		end
		rawset(t, k, v)
	end
}
setmetatable(_G, globalsChecker)

require "../base/base"
require "settings"
require "base/path" -- extend path module
local World = require "../base/world"


local Entrypoints = require "../base/entrypoints"
-- require "task/tasks"
require "control/coordinator"
require "tests/tests"
--require "tests/agents"

local debug = require "../base/debug"
local Cache = require "../base/cache"
local Observer = require "observer/observer"

local wrapper = function (func)
	return function()
		-- require "../test/debug/enable"
		World.update()
		Observer.observe()
		if not func() then -- Entrypoint has to return true if robots shouldn't be stopped on halt
			if World.RefereeState == "Halt" then
				World.haltOwnRobots()
			end
		end
		World.setRobotCommands()
		Observer.analyze()
		debug.resetStack()
		Cache.resetFrame()
	end
end

return {name = "Marvin", entrypoints = Entrypoints.get(wrapper)}
