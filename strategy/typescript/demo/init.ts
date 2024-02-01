// To run the strategy in Ra you need to select this init script in the team widget
// The init script *has* to be named "init.ts"

// All base modules are documented fairly well in code
// This has to be imported first, so there is no way around having it in the wrong order.
// Importing base/base initializes the base modules.
/* eslint-disable import/order */
import "base/base";

// Add entrypoints for selection in Ra
import * as Entrypoints from "base/entrypoints";
// Access to the debug tree
import * as debug from "base/debug";
// Used here to dump locals on crash
import * as Debugger from "base/debugger";
// Holds world state and geometry
import * as World from "base/world";
// Support for visualizations
import * as vis from "base/vis";
// For adding data to the plotter
import * as plot from "base/plot";
// Type of World.Time
import { AbsTime } from "base/timing";


// Used for driving arround a bit and then change directions
let directionChangeTime: AbsTime = World.Time;
let spline = [{ t_start: 0, t_end: Infinity,
	x: { a0: 0, a1: 0.5, a2: 0, a3: 0 },
	y: { a0: 0, a1: 0, a2: 0, a3: 0 },
	phi: { a0: 0, a1: 0, a2: 0, a3: 0 }
}];
let frameCount = 0;

const main = function(): boolean {
	if (frameCount % 100 === 0) {
		// Use amun.log() to output data in Ra's log widget
		amun.log("Strategy run");
	}
	frameCount = frameCount + 1;

	// Various visualizations can be added (circle, path, polygon, axis aligned rectangle, pizza)
	// For their method signatures see base/vis
	// For information about ball objects see base/ball
	vis.addPath("ball speed", [World.Ball.pos, World.Ball.pos + World.Ball.speed], vis.colors.red, undefined, undefined, 2 * World.Ball.radius);

	// Add information to the debug tree
	// Sub-trees can be created using path-like key names or with debug.push()
	debug.set("Ball/pos", World.Ball.pos);
	debug.push("Ball");
	debug.set("speed", World.Ball.speed);
	debug.pop();

	// Time is in seconds
	if (World.Time - directionChangeTime > 2) {
		directionChangeTime = World.Time;
		spline[0].x.a1 = -spline[0].x.a1;
	}
	// One of the methods to get a team's robots
	const robot = World.FriendlyRobotsById[0];
	if (robot) {
		spline[0].x.a0 = robot.pos.x;
		spline[0].y.a0 = robot.pos.y;
		robot.setControllerInput({ spline });
	}
	return true;
};

Entrypoints.add("Demo", main);
// You can also create a hierarchy of entrypoints
Entrypoints.add("Sub/Demo", main);

// The strategy runs at a maximum frequency of 100Hz.
// In case the strategy takes more than 10ms for a frame, only the latest available tracking output is used.
// The strategy's wrapper function is called with the selected entrypoint passed as its first parameter
const wrapper = function(func: () => boolean): Function {
	return function() {
		Debugger.runDebugger();

		// Has to be called each frame
		World.update();

		// Call the selected entrypoint
		func();

		// Call this function to pass robot commands set during the strategy run back to amun
		World.setRobotCommands();
		// Clear the debug tree. Otherwise old output would pile up
		debug.resetStack();
		plot._plotAggregated();
	};
};

// entrypoints is a table mapping entrypoint names to typescript functions
export const scriptInfo = { name: "Demo Strategy", entrypoints: Entrypoints.get(wrapper) };
