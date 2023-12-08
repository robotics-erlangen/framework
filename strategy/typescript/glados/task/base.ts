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
	private _mainAttackerParameters: MainAttackerParameters | undefined;

	protected get _messaging() {
		return this._behavior.agent().messaging();
	}

	public constructor(behavior: Behavior) {
		this._behavior = behavior;
		this._robot = behavior.agent().robot();
		this.clearMainAttackerParameters();
	}

	public behavior() {
		return this._behavior;
	}

	public abstract run(): void;

	// use for type stubs, to avoid cyclic imports
	public isTask(): boolean {
		return true;
	}

	public clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	public setMainAttackerParameters(target: Position, endSpeedLength: number, overwriteRating?: number) {
		this._mainAttackerParameters = [target, endSpeedLength, overwriteRating];
	}

	public mainAttackerParameters(): MainAttackerParameters | undefined {
		return this._mainAttackerParameters;
	}
}
