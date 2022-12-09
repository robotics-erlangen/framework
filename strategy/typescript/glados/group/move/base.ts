import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";

import { BehaviorConstructor } from "glados/agent/base/behavior";
import { MessageBox } from "glados/control/messaging";
import { TaskConstructor, TaskParameters } from "glados/task/base";

export { MessageBox } from "glados/control/messaging";

type AssignmentWithTask<T extends TaskConstructor> = ([] extends TaskParameters<T> ? {
	class: T;
	params?: TaskParameters<T>;
	restart?: boolean;
} : {
	class: T;
	params: TaskParameters<T>;
	restart?: boolean;
}) | {
	class: "none";
	params?: undefined;
	restart?: undefined;
};

type AssignmentWithBehavior<T extends BehaviorConstructor> = {
	behavior: T;
	restart?: boolean;
};

export class Assignment {
	public class: TaskConstructor | "none" | undefined;
	public behavior: BehaviorConstructor | undefined;
	public params: any[] | undefined;
	public restart: boolean | undefined;

	public static create<T extends TaskConstructor>(data: AssignmentWithTask<T>): Assignment {
		return new Assignment(data.class, undefined, data.params, data.restart);
	}

	public static createBehaviorAssignment<T extends BehaviorConstructor>(data: AssignmentWithBehavior<T>): Assignment {
		return new Assignment(undefined, data.behavior, undefined, data.restart);
	}

	private constructor(task: any, behavior: any, params: any, restart: any) {
		this.class = task;
		this.params = params;
		this.restart = restart;
		this.behavior = behavior;
	}

	// add a function to the type so that a simple assignment with {class: ..., behavior: ... etc} does not work
	private __functionForNonAssignability() {}
}

export interface MoveParameters {
	assignments: Map<FriendlyRobot, Assignment>;
	mainAttacker?: FriendlyRobot;
}

export abstract class Move {
	private _firstFrame: boolean = true;
	protected _robots: FriendlyRobot[];
	protected _messaging: MessageBox;

	protected static Referee: typeof Referee = Referee;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		this._firstFrame = true;
		this._robots = robots;
		this._messaging = messaging;
	}

	public updateTasks(): MoveParameters {
		let params = this._updateTasks();
		for (let assignment of params.assignments.values()) {
			assignment.restart = assignment.restart || this._firstFrame; // TODO: test
		}
		this._firstFrame = false;
		return params;
	}

	static injectReferee(pseudoRef: typeof Referee) {
		Move.Referee = pseudoRef;
	}

	public static wantedMaxRobots(availableRobots: number): number {
		return this.MAX_ROBOTS;
	}

	// abstract members

	public abstract static MAX_ROBOTS: number;
	public abstract static MIN_ROBOTS: number;
	public abstract static ALLOW_EXTRA_ATTACKERS: boolean;
	public static NAME: string = "";

	/**
	 * Checks whether a move is suitable for execution in the current
	 * situation.
	 * @param numCandidateRobots - The maximum number of robots that would be
	 * available for the move. The move can still request more or less robots
	 * later (through MAX_ROBOTS/wantedMaxRobots)
	 * @returns whether the move is suitable for execution
	 */
	public abstract static canStart(numCandidateRobots: number): boolean;
	public abstract _canContinue(): boolean;
	protected abstract _updateTasks(): MoveParameters;
}
