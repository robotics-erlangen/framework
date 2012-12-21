require "../base/base"
local World = require "../base/world"

local globals = {}
local function saveGlobals()
	globals = {}
	for k, v in pairs(_G) do
		globals[k] = true
	end
end

local function checkGlobals()
	for k, v in pairs(_G) do
		if not globals[k] then
			log("Unexpected global: " .. k)
		end
	end
end

Entrypoints = {}
saveGlobals()
require "task/tasks"
require "play/plays"
require "control/coordinator"
require "base/path" -- extend path module
-- TODO: include tests
-- TODO: include utils

local debug = require "../base/debug"
--local Observer = require "observer/observer"
checkGlobals()

for name, func in pairs(Entrypoints) do
	Entrypoints[name] = function ()
		saveGlobals()
		World.update()
		if not func() then -- Entrypoint has to return true if robots shouldn't be stopped on halt
			if World.RefereeState == "Halt" then
				World.haltOwnRobots()
			end
		end
		World.setRobotCommands()
		debug.resetStack()
		checkGlobals()
	end
end

return {name = "Marvin", entrypoints = Entrypoints}
