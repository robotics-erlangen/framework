// This is a move-stub. Moves can freely control multiple robots by assigning Tasks to them. We'll
// take a look at tasks later on.

// To use other classes, we need to require them.
// E.g.: In order to use the MoveToPos-Task, we need to require it first.
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

// This line creates the Tutorial-class.
// If you want to create a new class, copying an existing one is usually the way to go.
export class Tutorial extends Move {
	// We need to specify the number of robots we need. We can state both a minimum and a maximum,
	// if both are the same number we get exactly that number.
	public static MIN_ROBOTS: number = 3;
	public static MAX_ROBOTS: number = 3;

	// if you need any additional attributes, define them heres

	// This is, like the name obviously indicates, the constructor.
	// It creates an object (of the type) of this move.
	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}

	// This is a necessary function that every move must have. It needs to return a boolean value
	// that is used to evaluate if a move should start now.
	// Note that the static in typescript is equivalent to the static in Java.
	// All other methods are instance methods. The object instance is accessible via the variable "this".
	static canStart() {
		return true;
	}

	// During a move, the strategic situation may change in a way that the current move is no longer viable.
	// This function checks if the move can continue. If canContinue does not return true, the move is stopped.
	public _canContinue() {
		return true;
	}

	// This function is called every frame and needs to return an assignment for each robot.
	// Robots that don't get an assignment no longer participate in the move!
	public _updateTasks(): [Map<FriendlyRobot, Assignment>, undefined] {

		// The task assignments are returned as a map.
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		// this._robots[i] accesses the i-th participating robot.
		// Note: "i" is a placeholder and not a valid variable. Replace it by a number (or a number variable).
		// You need to assign each robot the class of the task you want it to use (needs to be imported at the top!).
		// Depending on the task you may need parameters, these can be passed as a array.
		// For example, MoveToPos needs a position to drive to.
		taskAssignments[this._robots[i]] = {class: MoveToPos, params: [new Vector(0,0)]});

		return [taskAssignments, undefined];
	}
}
