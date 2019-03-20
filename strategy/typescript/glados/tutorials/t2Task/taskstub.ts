// To use modules outside of this file, we need to import them.

// We use Vectors (among other things) as positions
import { Vector } from "base/vector";

// The tutorial class extends Task and the constructor of the Task-class expects an agent
import { Agent, Task } from "glados/task/base";
// "PathHelper" is a class needed for pathfinding.
import * as PathHelper from "glados/trajectory/pathhelper";
// "ToTarget" is a class that allows driving to a certain positions.
import { ToTarget } from "glados/trajectory/totarget";

// same as the move, this line creates the task-class
export class Tutorial extends Task {
	// This is the attribute dir (short for direction).
	// This is just an example attribute and not necessarily needed
	// By convention, private attributes have a leading underscore
	private _dir: number | undefined = undefined;

	// This is, like the name obviously indicates, the constructor.
	// It creates an object (of the type) of this task.
	constructor(agent: Agent, dir: number) {
		super(agent);
	}

	// this function is called each frame and tells the robot what to do
	// note that it doesn't return anything, all robot commands are issued by functions
	public run() {
		// this line adds obstacles to be considered by pathfinding
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true });

		// this function tells the robot where to move
		// "ToTarget" is a so called "handler", that moves a robot to a given position
		// another type of handler, for example, could move a robot in a given direction
		// each handler needs different parameters
		// the needed parameters for a handler are listed in the update function of the respective file in "glados/trajectory"
		// note that the function also returns something, although that is not relevant for this assignment
		this._robot.trajectory.update(ToTarget, new Vector(0,0), this._dir, undefined, undefined);
	}
}
