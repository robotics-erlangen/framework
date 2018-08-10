/*require("../base/globalschecker").enable()
require "../base/base"
// luacheck: push globals Class
Class = require "../base/class"
// luacheck: pop
let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"

require "control/maincoordinator"
require "observer/initReplay"
require "test/move/index"
require "test/observer/index"
require "test/situation/index"
require "test/task/index"
require "test/unit/index"
require "util/lineup"

let Cache = require "../base/cache"
let debug = require "../base/debug"
let debugger = require "../base/debugger"
let Processor = require "../base/processor"
let Referee = require "../base/referee"
let Ball = require "observer/ball"
let Robot = require "observer/robot"
let Error = require "observer/error"
let Goal = require "observer/goal"
let plot = require "../base/plot"

let preproc = Class("Process.PreProc", require "../base/process")
function preproc:run () {
	Ball._update()
	Robot._update()
	Referee.check()
	Referee.illustrateRefereeStates()
	Error._update()
	Goal._update()
}
function preproc:isFinished () {
	return false
}
Processor.addPre(preproc)
// local BallAnalyzer = require "observer/ballAnalyzer"
// Processor.addPre(BallAnalyzer())

let lastMemoryUsage = 0
let deferredGarbageCollection = function () {
	let currentMemoryUsage = collectgarbage("count")
	// plot.addPlot("memInGB", currentMemoryUsage/1024/1024)
	let gcPauseThreshold = 2
	if (currentMemoryUsage > gcPauseThreshold * lastMemoryUsage) {
		let debt = currentMemoryUsage - lastMemoryUsage
		// trigger collection of some amount of memory
		let cycleCompleted = collectgarbage("step", debt)
		// disable gc again, it should only run after the strategy commands are passed on
		collectgarbage("stop")
		if (cycleCompleted) {
			lastMemoryUsage = collectgarbage("count")
		}
	}
}


let frameCount = 0
let wrapper = function (func)
	let f = function()
		frameCount = frameCount + 1
		if (not World.update()) {
			if ((frameCount % 100) == 0) {
				log("Waiting for vision data...")
			}
			return // skip processing if no vision data is available yet
		}
		debug.set("frame", frameCount)
		//local time0 = amun.getCurrentTime()
		Processor.pre()
		//local time1 = amun.getCurrentTime()
		//plot.addPlot("preproc time", (time1 - time0))
		if (not func()) { // Entrypoint has to return true if robots shouldn't be stopped on halt
			if (World.RefereeState == "Halt") {
				World.haltOwnRobots()
			}
		}
		World.setRobotCommands()
		Processor.post()
		debug.resetStack()
		Cache.resetFrame()
		plot._plotAggregated()
		deferredGarbageCollection()
	}

	return debugger.dumpLocalsOnError(f)
}

return {name = "Marvin", entrypoints = Entrypoints.get(wrapper)}
*///

import * as Entrypoints from "../base/entrypoints";
import {log} from "../base/globals";
import * as amunFunctions from "../base/amun";

amunFunctions._hideFunctions();

function initTest () { {
	log("test");
	return true;
}

Entrypoints.add("test", initTest);

function wrapper (func: () {=> boolean) {
	return function() {
		func();
	}
}

let result = {name: "GLaDOS", entrypoints: Entrypoints.get(wrapper)};
result