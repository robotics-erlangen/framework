import * as debug from "base/debug";
import { Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

let lastStationary: Map<Robot, boolean> = new Map<Robot, boolean>();
const STD_THRESHOLD = 0.008;
const STD_HYSTERESIS = 0.0005;
const NUMBER_OF_MEASUREMENTS = 10;
const zeroVector = new Vector(0, 0);
let lastRobotPositions: Map<Robot, Position[]> = new Map<Robot, Position[]>();

let measurementIndex = 0;
function updateStationary() {
	debug.pushtop("crash.stationary");
	for (let robot of World.OpponentRobots) {
		debug.push(`Robot ${robot.id}`);
		debug.set(undefined, robot);

		// Then check for standard deviation of the last few positions

		// Record measurement first
		if (!lastRobotPositions.has(robot)) {
			let startingArray: Position[] = new Array(NUMBER_OF_MEASUREMENTS);
			for (let i = 0; i < NUMBER_OF_MEASUREMENTS; i++) {
				startingArray[i] = zeroVector;
			}
			lastRobotPositions.set(robot, startingArray);
		}
		let lastPositions = lastRobotPositions.get(robot);
		lastPositions![measurementIndex] = robot.pos;
		lastRobotPositions.set(robot, lastPositions!);

		// Calculate mean and std
		let mean = zeroVector;
		for (let i = 0; i < NUMBER_OF_MEASUREMENTS; i++) {
			mean = mean + lastPositions![i];
		}
		mean = mean / NUMBER_OF_MEASUREMENTS;

		let std = 0;
		for (let i = 0; i < NUMBER_OF_MEASUREMENTS; i++) {
			std = std + (lastPositions![i] - mean).lengthSq();
		}
		std = Math.sqrt(std / (NUMBER_OF_MEASUREMENTS - 1));

		let effective_std_threshold = lastStationary.get(robot) ? STD_THRESHOLD + STD_HYSTERESIS : STD_THRESHOLD - STD_HYSTERESIS;

		lastStationary.set(robot, std < effective_std_threshold);

		debug.set("std", std);
		debug.set("stationary", std < effective_std_threshold);
		debug.pop();
	}
	debug.pop();
	measurementIndex = (measurementIndex + 1) % NUMBER_OF_MEASUREMENTS;
}

export function getStationary(robot: Robot) {
	return lastStationary.get(robot);
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
