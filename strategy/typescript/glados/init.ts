// the order of imports is important here, so proper grouping is impossible
/* eslint-disable import/order */
import "base/base";

import { log } from "base/amun";
import * as Cache from "base/cache";
import * as debug from "base/debug";
import * as Debugger from "base/debugger";
import * as Entrypoints from "base/entrypoints";
import * as GameController from "base/gamecontroller";
import * as Option from "base/option";
import * as plot from "base/plot";
import { Process } from "base/process";
import * as Processor from "base/processor";
import * as Referee from "base/referee";
import * as World from "base/world";

import "glados/control/maincoordinator";
import "glados/observer/initReplay";
import "glados/group/move/hardwarechallenges/index";
import "glados/test/move/index";
import "glados/tutorials/index";
import "glados/util/lineup";

import * as Ball from "glados/observer/ball";
import * as Crash from "glados/observer/crash";
import * as ErrorObserver from "glados/observer/error";
import * as Goal from "glados/observer/goal";
import * as ObserverReferee from "glados/observer/referee";
import * as Robot from "glados/observer/robot";
import { lowFPSObserver } from "glados/observer/lowfps";

import "glados/test/observer/index";
// require "test/situation/index";
// require "test/task/index";
// require "test/unit/index";
import "glados/test/unit/index";
import "glados/observer/modificationchecker";
/* eslint-enable import/order */

class PreProc implements Process {
	public run() {
		Ball._update();
		Robot._update();
		Referee.check();
		Referee.illustrateRefereeStates();
		ErrorObserver._update();
		Goal._update();
		GameController._update();
		lowFPSObserver.update();
		Crash._update();
		ObserverReferee._update();
		ObserverReferee.checkChooseKeeper();
	}

	public isFinished(): boolean {
		return false;
	}
}
Processor.addPre(new PreProc());
// import {BallAnalyzer} from "glados/observer/ballAnalyzer";
// Processor.addPre(new BallAnalyzer)

class PostProc implements Process {
	private takingAdvantage: boolean = false;

	public run() {
		if (GameController.isConnected()) {
			if (!this.takingAdvantage && Referee.hasTooManyOpponentRobots() && ObserverReferee.shouldTakeAdvantage()) {
				log("Taking advantage");
				GameController.sendAdvantageReponse("continue");
				this.takingAdvantage = true;
			} else if (this.takingAdvantage && !(Referee.hasTooManyOpponentRobots() && ObserverReferee.shouldTakeAdvantage())) {
				log("Stopping advantage");
				GameController.sendAdvantageReponse("stop");
				this.takingAdvantage = false;
			}
		}
	}

	public isFinished(): boolean {
		return false;
	}
}
Processor.addPost(new PostProc());

let frameCount = 0;
function wrapper(func: () => boolean) {
	return function() {
		frameCount = frameCount + 1;
		Debugger.runDebugger();

		debug.set("isPerformanceMode", amun.isPerformanceMode);

		if (!World.update()) {
			if ((frameCount % 100) === 0) {
				log("Waiting for vision data...");
			}
			return; // skip processing if no vision data is available yet
		}
		debug.set("frame", frameCount);
		// let time0 = amun.getCurrentTime();
		Processor.pre();
		// let time1 = amun.getCurrentTime();
		// plot.addPlot("preproc time", (time1 - time0));
		const executionResult = func();
		// Entrypoint has to return true if robots shouldn't be stopped on halt
		if (!executionResult && World.RefereeState === "Halt") {
			World.haltOwnRobots();
		}
		World.setRobotCommands();
		Processor.post();
		debug.resetStack();
		Cache.resetFrame();
		plot._plotAggregated();
	};
}

let result: any = { name: "GLaDOS", entrypoints: Entrypoints.get(wrapper) };
result[Option.getExportName()] = Option.getExportedOptions();
export const scriptInfo = result;
