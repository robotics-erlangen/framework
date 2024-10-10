/**
 * Tutorial 2: Task
 *
 * For this assignment, we also want the robots to move along triangles.
 * This time however, we have a Move that assigns this Task.
 * Now the Task has to take care of moving in triangles.
 *
 * The "index" constructor parameter is a number from 0 to 2 and dictates your initial
 * position in the triangle.
 * The positions are 1m away from the middle and seperated by 120°
 * respectively. So the first robots initial position is at 120°, the second at
 * 240° and the last at 360° (or 0°).
 * As soon as a robot arrives at its position, it should move towards the next.
 *
 * Execute the Move with the entrypoint "Tutorial/Tutorial 2"
 *
 * Hints:
 * - if you have trouble imagining the positions, just start the Move,
 *   the Move will move into the correct positions first before assigning this Task
 * - we measure angle in radians (2 * math.pi == 360°)
 *
 * - the function Vector.fromAngle(angle) creates a Vector of length 1 in the specified direction
 * - Vector.distanceTo(vector) measures the distance between two vectors
 *   e.g. pos.distanceTo(new Vector(0,0)) would measure the distance of 'pos' from the middle in meters
 *
 * - unlike Moves, Tasks only handle one robot (so just this._robot)
 * - take a look at "taskrunner.ts" in the same folder as this file to see how the Task is called
 * - real-life vision is never perfectly accurate, an accuracy of 10cm is sufficient (for this case, not in general!)
 */

/**
 * We import several necessary classes for path finding, etc.
 */
import { Vector } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

/**
 * Same as with the Move, this line creates the Task class.
 *
 * A Task controls a single robot and represents the
 * smallest unit of control we use in our framework.
 */
export class Tutorial2 extends Task {
	/**
	 * This is the attribute x of type number.
	 * You can access it with this._x in method bodies.
	 * By convention, private attributes have a leading underscore.
	 */
	private _x: number | undefined = undefined;

	/**
	 * This is, like the name obviously indicates, the constructor.
	 * It creates an object of this Task class.
	 */
	public constructor(behavior: Behavior, index: number) {
		super(behavior);
	}

	/**
	 * This function is called each frame and tells the robot what to do.
	 * Note that it doesn't return anything, all robot commands are issued by functions.
	 */
	public run() {
		// This line adds obstacles to be considered by the pathfinding.
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		// This function tells the robot where to move (currently the center of the field).
		// "ToTarget" is a so called handler, that moves a robot to a given position.
		// Another type of handler, for example, could move a robot in a given direction.
		// Each handler needs different parameters.
		// The needed parameters for a handler are listed in the update function of the respective file in "glados/trajectory"
		// Note that the function also returns something, although that is not relevant for this tutorial.
		this._robot.trajectory.update(ToTarget, new Vector(0, 0));
	}
}
