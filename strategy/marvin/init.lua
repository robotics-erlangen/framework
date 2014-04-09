require("../base/globalschecker").enable()
require "../base/base"
require "settings"
require "base/path" -- extend path module
local World = require "../base/world"

local Entrypoints = require "../base/entrypoints"
require "control/coordinator"
require "test/unit/init"
require "test/situation/init"
require "test/observer/init"
require "util/lineup"
require "challenge/iranopen2014/navigationactive"
require "challenge/iranopen2014/navigationpassive"
require "challenge/iranopen2014/triumph"
require "test/task/sst"
require "test/fixedroles/init"
local testroles = "test/fixedroles/roles"

local debug = require "../base/debug"
local Cache = require "../base/cache"
local Processor = require "../base/processor"
local Robot = require "observer/robot"
local Referee = require "../base/referee"

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
		if not World.update() then
			return -- skip processing if no vision data is available yet
		end
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

return {name = "Marvin", entrypoints = Entrypoints.get(wrapper), testroles = testroles}
