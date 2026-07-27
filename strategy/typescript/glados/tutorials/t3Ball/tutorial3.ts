/**
 * Tutorial 3: Ball
 *
 * For the third tutorial we want you to create another Task.
 * When this Task is run, a ball was shot in your robot's general direction/
 * Intercept the ball and shoot it at the opponent's goal.
 *
 * Execute this tutorial with the entrypoint "Tutorials/Tutorial 3"
 *
 * Hints:
 * - You can get the current state of the ball from World.Ball
 * - World.Ball.pos is a Vector describing the current ball position
 * - World.Ball.speed also is a Vector
 *   This vector's length is the absolute speed and the vector's angle is the direction of the speed
 *
 * - We have a module to assist all your ball-shooting needs
 *   It is located in "glados/task/ability/shoot.ts"
 * - To make use of it, import it and create a new instance of it
 * - Take a look at "glados/task/shared/pass.ts" to find an example of how to properly use the 'shoot' ability
 *
 * - We also have a module that attempts to catch balls
 * - It is located in "glados/task/ability/catchball.ts"
 */

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

import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const G = World.Geometry;

export class Tutorial3 extends Task {
	public constructor(behavior: Behavior) {
		super(behavior);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		this._robot.trajectory.update(ToTarget, new Vector(0, 0));
	}
}
