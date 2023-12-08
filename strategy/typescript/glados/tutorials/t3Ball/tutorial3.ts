/*
 * For the third tutorial we want you to create another task.
 * When this task is run, a ball was shot in your robot's general direction/
 * Intercept the ball and shoot it at the opponent's goal.
 *
 * Execute this tutorial with the entrypoint "Tutorials/Tutorial 3"
 *
 * Hints:
 * - You can get the current state of the ball from World.Ball
 *   (You need to import world first)
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

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

export class TutorialTask extends Task {

	public constructor(behavior: Behavior) {
		super(behavior);
	}

	public run() {

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		this._robot.trajectory.update(ToTarget, this._robot.pos, this._robot.dir, undefined, undefined);
	}
}
