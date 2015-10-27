require("../base/globalschecker").enable()
Class = require "../base/class"
require "../base/base"
require "base/path" -- extend path module
local World = require "../base/world"

local Entrypoints = require "../base/entrypoints"
require "control/maincoordinator"
require "test/unit/init"
require "test/situation/init"
require "test/observer/init"
require "test/task/volley"
require "test/task/randomdefense"
require "util/lineup"
require "test/task/sst"

local debug = require "../base/debug"
local Cache = require "../base/cache"
local Processor = require "../base/processor"
local Robot = require "observer/robot"
local Referee = require "../base/referee"

local preproc = Class("Process.PreProc", require "../base/process")
function preproc:run()
    Robot.estimateOpponentDynamics()
    Robot:_updateMinTimeToBall()
    Robot._updateHadBall()
    Referee.checkTouching()
    Referee.illustrateRefereeStates()
end
function preproc:isFinished()
    return false
end
Processor.addPre(preproc)
-- local BallAnalyzer = require "observer/ballAnalyzer"
-- Processor.addPre(BallAnalyzer())
local frameCount = 0
local wrapper = function (func)
	return function()
		-- require "../test/debug/enable"
		if not World.update() then
			return -- skip processing if no vision data is available yet
		end
		frameCount = frameCount + 1
		debug.set("frame", frameCount)
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
