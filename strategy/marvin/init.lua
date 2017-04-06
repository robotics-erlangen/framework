require("../base/globalschecker").enable()
require "../base/base"
-- luacheck: push globals Class
Class = require "../base/class"
-- luacheck: pop
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

require "control/maincoordinator"
require "observer/initReplay"
require "test/move/init"
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
local Error = require "observer/error"
local plot = require "../base/plot"

local preproc = Class("Process.PreProc", require "../base/process")
function preproc:run()
	Ball._updateReceivesPass()
	Ball._updateIsAccelerating()
	Ball._updateIsShot()
	Ball._updateIsDangerousDuelSituation()
	Robot.estimateOpponentDynamics()
	Robot._resetMinTimeToBall()
	Robot._updateHadBall()
	Robot._updateTouchedBall()
	Robot._updateOwnStandardShooter()
	Referee.check()
	Referee.illustrateRefereeStates()
	Error._update()
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
		frameCount = frameCount + 1
		if not World.update() then
			if (frameCount % 100) == 0 then
				log("Waiting for vision data...")
			end
			return -- skip processing if no vision data is available yet
		end
		debug.set("frame", frameCount)
		--local time0 = amun.getCurrentTime()
		Processor.pre()
		--local time1 = amun.getCurrentTime()
		--plot.addPlot("preproc time", (time1 - time0))
		if not func() then -- Entrypoint has to return true if robots shouldn't be stopped on halt
			if World.RefereeState == "Halt" then
				World.haltOwnRobots()
			end
		end
		World.setRobotCommands()
		Processor.post()
		debug.resetStack()
		Cache.resetFrame()
		plot._plotAggregated()
	end
end

return {name = "Marvin", entrypoints = Entrypoints.get(wrapper)}
