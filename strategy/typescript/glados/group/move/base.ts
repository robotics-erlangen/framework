import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";

import { Behavior } from "glados/agent/base/behavior";
import { MessageBox } from "glados/control/messaging";
import { Agent, Task } from "glados/task/base";

export { MessageBox } from "glados/control/messaging";

type ConstructorParameters<T extends new (...args: any[]) => any> = T extends new (a: Agent, ...args: infer P) => any ? P : Error;

type AssignmentWithTask<T extends new (...args: any[]) => Task> = ([] extends ConstructorParameters<T> ? {
	class: T,
	params?: ConstructorParameters<T>,
	restart?: boolean
} : {
	class: T,
	params: ConstructorParameters<T>,
	restart?: boolean
}) | {
	class: "none",
	params?: undefined,
	restart?: undefined
};

type AssignmentWithBehavior<T extends new (...args: any[]) => Behavior> = {
	behavior: T,
	restart?: boolean
};

export class Assignment {
	public class: (new (agent: Agent, ...args: any[]) => Task) | "none" | undefined;
	public behavior: (new (...args: any[]) => Behavior) | undefined;
	public params: any[] | undefined;
	public restart: boolean | undefined;

	public static create<T extends new (...args: any[]) => Task>(data: AssignmentWithTask<T>): Assignment {
		return new Assignment(data.class, undefined, data.params, data.restart);
	}

	public static createBehaviorAssignment<T extends new (...args: any[]) => Behavior>(data: AssignmentWithBehavior<T>): Assignment {
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

	// abstract members

	public abstract static MAX_ROBOTS: number;
	public abstract static MIN_ROBOTS: number;
	public abstract static ALLOW_EXTRA_ATTACKERS: boolean;
	public static NAME: string = "";

	public abstract static canStart(): boolean;
	public abstract _canContinue(): boolean;
	protected abstract _updateTasks(): MoveParameters;
}
