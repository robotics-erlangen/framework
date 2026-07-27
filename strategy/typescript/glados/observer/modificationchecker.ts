/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

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
	public run() {
		initialBallPosition = new Vector(World.Ball.pos.x, World.Ball.pos.y);
		initialBallSpeed = new Vector(World.Ball.speed.x, World.Ball.speed.y);
		if (!initialBallPosition.equals(initialBallPosition)) {
			throw new Error("Got NaN as ball positon");
		}
		if (!initialBallSpeed.equals(initialBallSpeed)) {
			throw new Error("Got NaN as ball speed");
		}

		for (let robot of World.Robots) {
			robotPositions[robot] = new Vector(robot.pos.x, robot.pos.y);
			robotSpeeds[robot] = new Vector(robot.speed.x, robot.speed.y);
			if (!robotPositions[robot]!.equals(robotPositions[robot]!)) {
				throw new Error(`Got NaN as a robot ${robot.id} position`);
			}
			if (!robotSpeeds[robot]!.equals(robotSpeeds[robot]!)) {
				throw new Error(`Got NaN as a robot ${robot.id} speed`);
			}
		}
	}

	public isFinished() {
		return false;
	}
}
Processor.addPre(new ValueCollector());

class ValueChecker implements Process {
	public run() {
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

	public isFinished() {
		return false;
	}
}
Processor.addPost(new ValueChecker());
