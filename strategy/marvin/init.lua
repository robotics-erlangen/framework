require "../base/base"
require "settings"
require "base/path" -- extend path module
local World = require "../base/world"

local globals = {}
local function saveGlobals()
	globals = {}
	for k, _ in pairs(_G) do
		globals[k] = true
	end
end

local function checkGlobals()
	for k, _ in pairs(_G) do
		if not globals[k] then
			log("Unexpected global: " .. k)
		end
	end
end

Entrypoints = {}
saveGlobals()
-- require "task/tasks"
require "control/coordinator"
require "tests/tests"
--require "tests/agents"

local debug = require "../base/debug"
local Cache = require "../base/cache"
local Observer = require "observer/observer"
checkGlobals()

for name, func in pairs(Entrypoints) do
	Entrypoints[name] = function ()
		-- require "../test/debug/enable"
		saveGlobals()
		World.update()
		Observer.observe()
		if not func() then -- Entrypoint has to return true if robots shouldn't be stopped on halt
			if World.RefereeState == "Halt" then
				World.haltOwnRobots()
			end
		end
		World.setRobotCommands()
		debug.resetStack()
		Cache.resetFrame()
		checkGlobals()
	end
end

return {name = "Marvin", entrypoints = Entrypoints}
