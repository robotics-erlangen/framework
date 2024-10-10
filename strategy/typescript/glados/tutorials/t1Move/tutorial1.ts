/**
 * Tutorial 1: Move
 *
 * Your assignment is to get three robots to move along a triangular shape.
 * Use the MoveToPos-Task to do this. MoveToPos needs a Vector as parameter and will move to that position.
 * In order to start this Move in Ra, click the "main" button in the robots-widget to open a drop-down menu,
 * then locate "Tutorials" -> "Tutorial 1"
 * If you change anything in the code, the strategy has to be recompiled and reloaded in ra.
 * A manual for compiling can be found in the "COMPILE.md" file.
 * The reload button is next to the entrypoints (the blue arrows).
 *
 * Hints:
 *  - this._robots[i].pos returns the current position of the i-th robot
 *  - indices in typescript arrays start with 0 (like most of the programming languages)
 *  - keep in mind that it may take varying time for the robots to arrive at their initial positions
 *  - you can use other Moves as reference material, they are located in the folder glados/group/move
 *  - there's no need to change the _canStart and canContinue functions (as the tutorial only runs this Move)
 *  - as this stub is incomplete, it will currently crash instantly when run
 *  - as soon as the robots get valid assignments this should no longer happen
 *
 * We know the framework looks scaaaaryyyy, it takes a while to familiarize yourself with it,
 * so don't hesitate to ask questions ;)
 */

/**
 * To use other classes, we need to import them.
 * In order to use the MoveToPos-Task or the Vector class,
 * we need to import it first.
 */
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

/**
 * This is a Move.
 * Moves can freely control multiple robots by assigning Tasks to them.
 * We'll take a look at Tasks later on.
 */
export class Tutorial1 extends Move {
	/**
	 * We need to specify the number of robots our Move needs.
	 * We can state both a minimum and a maximum,
	 * if both are the same number we get exactly that number.
	 */
	public static readonly MIN_ROBOTS: number = 3;
	public static readonly MAX_ROBOTS: number = 3;

	/**
	 * This flag is for more advanced usecases,
	 * it's best to just set it to false.
	 */
	public static readonly ALLOW_EXTRA_ATTACKERS: boolean = false;

	/**
	 * This is, like the name obviously indicates, the constructor.
	 * It creates an object of this Move class.
	 */
	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}

	/**
	 * This is a necessary function that every Move must have.
	 * It needs to return a boolean value that is used to evaluate if a Move should start now.
	 * Note that the static in typescript is equivalent to the static in Java.
	 * All other methods are instance methods.
	 * The object instance is accessible via the variable "this".
	 */
	public static canStart() {
		return true;
	}

	/**
	 * During a Move, the strategic situation may change in a way that the current Move is no longer viable.
	 * This function checks if the Move can continue.
	 * If canContinue does not return true, the Move is stopped.
	 */
	public canContinue() {
		return true;
	}

	/**
	 * This function is called every frame and needs to return an assignment for each robot.
	 * Robots that don't get an assignment no longer participate in the Move!
	 * That also means if you assign less that MIN_ROBOTS a Task,
	 * this Move can't run.
	 */
	protected _updateTasks(): MoveParameters {
		// A map assigning a Task to every participating robot.
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		// this._robots[i] accesses the i-th participating robot.
		let robot = this._robots[0];
		taskAssignments[robot] = Assignment.create({
			// You need to assign each robot the class of the task you want it to use.
			class: MoveToPos,
			// Depending on the Task you may need parameters, these can be passed as a array.
			// For example, MoveToPos needs a position to drive to.
			params: [{ pos: robot.pos }],
			// Note you have to restart the Task if you change the vector.
			restart: false,
		});

		return {
			assignments: taskAssignments,
			// This parameter is for more advaned usecases, leave it undefined for now.
			mainAttacker: undefined
		};
	}
}
