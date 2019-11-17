
/*
 * For this assignment, we also want the robots to move along triangles.
 * This time however, we have a move that assigns this task.
 * Now the task has to take care of moving in triangles.
 *
 * Like last time, there is a commented stub in the same folder as this file.
 *
 * The "initialPos" parameter is a number from 0 to 2 and dictates your initial
 * position in the triangle.
 * The positions are 1m away from the middle and seperated by 120°
 * respectively. So the first robots initial position is at 120°, the second at
 * 240° and the last at 360° (or 0°).
 * As soon as a robot arrives at its position, it should move towards the next.
 *
 * Execute the move with the entrypoint "Tutorial/Tutorial 2"
 *
 * Hints:
 * - if you have trouble imagining the positions, just start the move,
 *   the move will move into the correct positions first before assigning this task
 * - we measure angle in radians (2 * math.pi == 360°)
 *
 * - the function Vector.fromAngle(angle) creates a Vector of length 1 in the specified direction
 * - Vector.distanceTo(vector) measures the distance between two vectors
 *   e.g. pos.distanceTo(new Vector(0,0)) would measure the distance of 'pos' from the middle in meters
 *
 * - unlike moves, tasks only handle one robot (so just this._robot)
 * - take a look at "tutentrypoint.ts" in the same folder as this file to see how the task is called
 * - real-life vision is never perfectly accurate, an accuracy of 10cm is sufficient (for this case, not in general!)
 */

import * as World from "base/world";

import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

export class TutorialTask extends Task {

	constructor(agent: Agent, initialPos: number) {

		super(agent);

	}

	public run() {

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		this._robot.trajectory.update(ToTarget, this._robot.pos, this._robot.dir, undefined, undefined);
	}
}
