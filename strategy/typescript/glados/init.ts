/*require("base/globalschecker").enable()
require "base/base"
// luacheck: push globals Class
Class = require "base/class"
// luacheck: pop
let Entrypoints = require "base/entrypoints"
let World = require "base/world"

require "control/maincoordinator"
require "observer/initReplay"
require "test/move/index"
require "test/observer/index"
require "test/situation/index"
require "test/task/index"
require "test/unit/index"
require "util/lineup"

let Cache = require "base/cache"
let debug = require "base/debug"
let debugger = require "base/debugger"
let Processor = require "base/processor"
let Referee = require "base/referee"
let Ball = require "observer/ball"
let Robot = require "observer/robot"
let Error = require "observer/error"
let Goal = require "observer/goal"
let plot = require "base/plot"

let preproc = Class("Process.PreProc", require "base/process")
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

import "base/base";
import * as Entrypoints from "base/entrypoints";
import {log, Vector} from "base/globals";
import * as debug from "base/debug";
declare var path: any;
let pathLocal = path;
import * as amunFunctions from "base/amun";
import {Coordinates, _setIsBlue} from "base/coordinates";
_setIsBlue(true);
import * as vis from "base/vis";
import "base/trajectory";
import "base/ball";
import "base/timing";
import * as World from "base/world";
import "base/referee";
import * as Field from "base/field";
import {CurvedMaxAccel} from "glados/trajectory/curvedmaxaccel";
import {FriendlyRobot} from "base/robot";
//import * as test from "glados/control/messaging";
//import * as test from "glados/observer/physics";

let counter = 0;
function initTest (): boolean {
	//let limited = Field.limitToAllowedField(World.Ball.pos);
	//vis.addCircle("1Test", limited, 0.1, vis.colors.red);
	let robot = World.FriendlyRobots[0];
	let moveTo = World.Ball.pos;
	robot.path.clearObstacles();
	robot.path.setRadius(robot.radius);
	for (let i = 1;i<World.FriendlyRobots.length;i++) {
		robot.path.addCircle(World.FriendlyRobots[i].pos.x, World.FriendlyRobots[i].pos.y, 0.2, "asdf");
		vis.addCircle("1Test", World.FriendlyRobots[i].pos, 0.2, vis.colors.red);
	}
	robot.trajectory.update(CurvedMaxAccel, moveTo, 0);
	vis.addCircle("1Test", World.Ball.pos, 0.5, vis.colors.redHalf, true);

	return true;
}

Entrypoints.add("test", initTest);

function wrapper (func: ()=> boolean) {
	return function() {
		counter++;
		World.update();
		if (counter < 5) {
			return;
		}
		func();
		World.setRobotCommands();
	}
}

let result = {name: "GLaDOS", entrypoints: Entrypoints.get(wrapper)};
export const scriptInfo = result;