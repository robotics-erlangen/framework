import * as debug from "base/debug";
import { AccumVectorRingBuffer } from "base/ringbuffer";
import { Robot } from "base/robot";
import * as World from "base/world";

const STD_THRESHOLD = 0.008;
const STD_HYSTERESIS = 0.0005;
const NUMBER_OF_MEASUREMENTS = 10;
const lastStationary = new Map<Robot, boolean>();
const lastRobotPositions = new Map<Robot, AccumVectorRingBuffer>();

function updateStationary() {
	debug.pushtop("crash.stationary");
	for (let robot of World.OpponentRobots) {
		debug.push(`Robot ${robot.id}`);
		debug.set(undefined, robot);

		// Record measurement first
		if (!lastRobotPositions.has(robot)) {
			lastRobotPositions[robot] = new AccumVectorRingBuffer(NUMBER_OF_MEASUREMENTS);
		}
		const lastPositions = lastRobotPositions[robot]!;
		lastPositions.putOrReplace(robot.pos);

		// Then check for standard deviation of the last few positions
		const stdev = lastPositions.stdev() ?? 0;
		const effective_std_threshold = lastStationary[robot] ? STD_THRESHOLD + STD_HYSTERESIS : STD_THRESHOLD - STD_HYSTERESIS;
		lastStationary[robot] = (stdev < effective_std_threshold);

		debug.set("std", stdev);
		debug.set("stationary", lastStationary[robot]);
		debug.pop();
	}
	debug.pop();
}

export function getStationary(robot: Robot) {
	return lastStationary[robot];
}

let lastIsCrashed = false;
function updateIsCrashed() {
	for (let robot of World.OpponentRobots) {
		if (!lastStationary.has(robot) || !lastStationary.get(robot)) {
			lastIsCrashed = false;
			return;
		}
	}
	lastIsCrashed = true;
}

export function isCrashed() {
	return lastIsCrashed;
}

export function _update() {
	updateStationary();
	updateIsCrashed();
	debug.pushtop("crash.stationary");
	debug.set("crashed", lastIsCrashed);
	debug.pop();
}
