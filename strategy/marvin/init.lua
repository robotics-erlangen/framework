require("../base/globalschecker").enable()
Class = require "../base/class"
require "../base/base"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

require "control/maincoordinator"
require "test/observer/init"
require "test/situation/init"
require "test/task/init"
require "test/unit/init"
require "util/lineup"

local Cache = require "../base/cache"
local debug = require "../base/debug"
local Processor = require "../base/processor"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local Robot = require "observer/robot"

local preproc = Class("Process.PreProc", require "../base/process")
function preproc:run()
	local pre = amun.getCurrentTime()
	Ball._updateReceivesPass()
	Ball._updateIsAccelerating()
	local post = amun.getCurrentTime()
    Robot.estimateOpponentDynamics()
    Robot._updateMinTimeToBall()
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
