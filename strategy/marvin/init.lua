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
local UserInput = require "../base/userinput"

local Entrypoints = require "../base/entrypoints"
-- require "task/tasks"
require "control/coordinator"
require "control/fixedroles"
require "tests/tests"
--require "tests/agents"

local debug = require "../base/debug"
local Cache = require "../base/cache"
local Processor = require "../base/processor"
local Robot = require "observer/robot"
local Referee = require "util/referee"

local preproc = (require "../base/class").new("Process.PreProc", require "../base/process")
function preproc:run()
    Robot.estimateOpponentDynamics()
    Robot._updateHadBall()
    Referee.illustrateRefereeStates()
end
function preproc:isFinished()
    return false
end
Processor.addPre(preproc)
    

local wrapper = function (func)
	return function()
		-- require "../test/debug/enable"
		World.update()
		UserInput.update()
		Processor.pre()
		if not func() then -- Entrypoint has to return true if robots shouldn't be stopped on halt
			if World.RefereeState == "Halt" then
				World.haltOwnRobots()
			end
		end
		World.setRobotCommands()
		Processor.post()
		debug.resetStack()
		Cache.resetFrame()
	end
end

return {name = "Marvin", entrypoints = Entrypoints.get(wrapper)}
