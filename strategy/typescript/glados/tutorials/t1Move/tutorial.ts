// Your assignment is to get three robots to move along a triangular shape.
// Use the MoveToPos-Task to do this. MoveToPos needs a Vector as parameter and will move to that position.
// In order to start this move in Ra, click the "main" button in the robots-widget to open a drop-down menu,
// then locate "Tutorials" -> "Tutorial 1"
// If you change anything in the code, the strategy has to be recompiled and reloaded in ra
// A manual for compiling can be found in the "COMPILE.md" file
// The reload button is next to the entrypoints (the blue arrows)

// Hints:
// 	- you can find a commented stub of a move under "glados/tutorials/t1Move/movestub.ts"
// 	- this._robots[i].pos returns the current position of the i-th robot
//  - indices in typescript tables start with 0 (like most of the programming languages)
// 	- keep in mind that it may take varying time for the robots to arrive at their initial positions
// 	- you can use other moves as reference material, they are located in the folder glados/group/move
//  - there's no need to change the _canStart and canContinue functions (as the tutorial only runs this move)
// 	- as this stub is incomplete, it will currently crash instantly when run
// 	- as soon as the robots get valid assignments this should no longer happen


// We know the framework looks scaaaaryyyy, it takes a while to familiarize yourself with it,
// so don't hesitate to ask questions ;)


import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

export class Tutorial extends Move {
	public static MIN_ROBOTS: number = 3;
	public static MAX_ROBOTS: number = 3;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}

	public static canStart() {
		return true;
	}

	public _canContinue() {
		return true;
	}

	public _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		taskAssignments[this._robots[0]] = {class: MoveToPos, params: [new Vector(0,0)]};

		return {
			assignments: taskAssignments,
			mainAttacker: undefined
		};
	}
}
