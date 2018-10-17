// For this assignment, we also want the robots to move along triangles.
// This time however, we have a move that assigns this task.
// Now the task has to take care of moving in triangles.
// Like last time, there is a commented stub in the same folder as this file.

// The "number" parameter is a number from 1 to 3 and dictates your position.
// The positions are 1m away from the middle and seperated by 120° respectively
// So the first robot is at 120°, the second at 240° and the last at 360° (or 0°)
// As soon as a robot arrives at its position, it should move towards the next
// Start the move with the entrypoint "MoveTest" -> "Tutorial2" 

// Hints:
// 	- if you have trouble imagining the positions, just start the move,
//    the move will move into the correct positions first before assigning this task
// 	- we measure angle in radians (2 * math.pi == 360°)
// 	- the function Vector.fromAngle(angle) creates a Vector of length 1 in the specified direction
// 	- vector.distanceTo(vector) measures the distance between two vectors 
//    e.g. pos.distanceTo(Vector(0,0)) would measure the distance of 'pos' from the middle in meters
// 	- unlike moves, tasks only handle one robot (so just this._robot)
// 	- real-life vision is never perfectly accurate, an accuracy of 10cm is sufficient (for this case, not in general!)

import * as PathHelper from "glados/trajectory/pathhelper";
import * as World from "base/world";

import { Agent, Task } from "glados/task/base";
import { ToTarget } from "glados/trajectory/totarget";

export class Tutorial extends Task {
	private _dir: number | undefined = undefined;

	constructor(agent: Agent, dir: number) {

		super(agent);

	}

	public run() {

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		this._robot.trajectory.update(ToTarget, undefined, this._dir, undefined, undefined);
	}
}