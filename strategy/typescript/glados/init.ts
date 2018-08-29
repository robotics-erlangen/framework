import "base/base";
import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";

import "glados/control/maincoordinator";
import "glados/observer/initReplay";
// require "test/move/index";
// require "test/observer/index";
// require "test/situation/index";
// require "test/task/index";
// require "test/unit/index";
import "glados/util/lineup";

import * as Cache from "base/cache";
import * as debug from "base/debug";
import {log} from "base/globals";
import {Process} from "base/process";
import * as Processor from "base/processor";
import * as plot from "base/plot";
import * as  Referee from "base/referee";
import * as Ball from "glados/observer/ball";
import * as Robot from "glados/observer/robot";
import * as Error from "glados/observer/error";
import * as Goal from "glados/observer/goal";


class PreProc implements Process {
	run () {
		Ball._update();
		Robot._update();
		Referee.check();
		Referee.illustrateRefereeStates();
		Error._update();
		Goal._update();
	}

	isFinished (): boolean {
		return false;
	}
}
Processor.addPre(new PreProc)
// import {BallAnalyzer} from "glados/observer/ballAnalyzer";
// Processor.addPre(new BallAnalyzer)

let frameCount = 0;
function wrapper (func: ()=> boolean) {
	return function() {
		frameCount = frameCount + 1
		if (!World.update()) {
			if ((frameCount % 100) == 0) {
				log("Waiting for vision data...")
			}
			return // skip processing if no vision data is available yet
		}
		debug.set("frame", frameCount)
		// let time0 = amun.getCurrentTime();
		Processor.pre()
		// let time1 = amun.getCurrentTime();
		// plot.addPlot("preproc time", (time1 - time0));
		if (!func()) { // Entrypoint has to return true if robots shouldn't be stopped on halt
			if (World.RefereeState === "Halt") {
				World.haltOwnRobots()
			}
		}
		World.setRobotCommands();
		Processor.post();
		debug.resetStack();
		Cache.resetFrame();
		plot._plotAggregated();
	}
}

let result = {name: "GLaDOS", entrypoints: Entrypoints.get(wrapper)};
export const scriptInfo = result;