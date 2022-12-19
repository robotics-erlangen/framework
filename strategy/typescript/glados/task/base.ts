import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";

export type MainAttackerParameters = [Position, number, number | undefined];

/**
 * A constructor that creates a task.
 *
 * Task always belong to a behavior, thus a behavior is mandatory as first
 * argument.
 */
export type TaskConstructor = new (behavior: Behavior, ...args: any[]) => Task;

/** The parameters needed to construct a task, excluding the mandatory behavior */
export type TaskParameters<T extends TaskConstructor> =
	// This conditional is always true since T extends TaskConstructor
	T extends new (behavior: Behavior, ...args: infer P) => Task
	? P
	: never;

export abstract class Task {
	private _behavior: Behavior;
	protected _robot: FriendlyRobot;
	_mainAttackerParameters: MainAttackerParameters | undefined;

	protected get _messaging() {
		return this._behavior.agent().messaging();
	}

	constructor(behavior: Behavior) {
		this._behavior = behavior;
		this._robot = behavior.agent().robot();
		this.clearMainAttackerParameters();
	}

	behavior() {
		return this._behavior;
	}

	abstract run(): void;

	// use for type stubs, to avoid cyclic imports
	isTask(): boolean {
		return true;
	}

	clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	setMainAttackerParameters(target: Position, endSpeedLength: number, overwriteRating?: number) {
		this._mainAttackerParameters = [target, endSpeedLength, overwriteRating];
	}

	mainAttackerParameters(): MainAttackerParameters | undefined {
		return this._mainAttackerParameters;
	}
}
