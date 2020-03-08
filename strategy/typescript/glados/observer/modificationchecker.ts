import { Process } from "base/process";
import * as Processor from "base/processor";
import { Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";


let initialBallPosition: Position = new Vector(0, 0);
let initialBallSpeed: Speed = new Vector(0, 0);
let robotPositions: Map<Robot, Position> = new Map();
let robotSpeeds: Map<Robot, Speed> = new Map();

class ValueCollector implements Process {
	run() {
		initialBallPosition = new Vector(World.Ball.pos.x, World.Ball.pos.y);
		initialBallSpeed = new Vector(World.Ball.speed.x, World.Ball.speed.y);

		for (let robot of World.Robots) {
			robotPositions[robot] = new Vector(robot.pos.x, robot.pos.y);
			robotSpeeds[robot] = new Vector(robot.speed.x, robot.speed.y);
		}
	}

	isFinished() {
		return false;
	}
}
Processor.addPre(new ValueCollector());

class ValueChecker implements Process {
	run() {
		if (amun.isDebug) {
			if (!World.Ball.pos.equals(initialBallPosition)) {
				throw new Error("Ball position was changed during strategy execution!");
			}
			if (!World.Ball.speed.equals(initialBallSpeed)) {
				throw new Error("Ball speed was changed during strategy execution!");
			}
			for (let robot of World.Robots) {
				if (!robot.pos.equals(robotPositions[robot]!)) {
					throw new Error(`Position of robot ${robot.id} changed during strategy execution`);
				}
				if (!robot.speed.equals(robotSpeeds[robot]!)) {
					throw new Error(`Speed of robot ${robot.id} changed during strategy execution`);
				}
			}
		}
	}

	isFinished() {
		return false;
	}
}
Processor.addPost(new ValueChecker());
