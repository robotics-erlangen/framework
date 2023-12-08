import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { Agent } from "glados/agent/base/agent";
import { MessageBox } from "glados/control/messaging";
import { Task, TaskConstructor, TaskParameters } from "glados/task/base";

export const CONTINUE_TASK = Symbol("CONTINUE_TASK");

export type BaseTaskAssignment = [TaskConstructor, any[]?, boolean?];

export type TaskAssignment<T extends TaskConstructor> =
	[T, TaskParameters<T>, boolean?]
	| (
		[] extends TaskParameters<T>
		? [T]
		: never
	);

/*
 * A constructor that creates a behavior.
 *
 * Behaviors always belong to an agent, thus an agent is mandatory as first
 * argument.
 */
export type BehaviorConstructor = new (agent: Agent) => Behavior;

export type MainAttackerParameters = [Position | undefined, number | undefined, number | undefined];

export type CheckableConstructor = new(a: Agent) => Checkable;

export interface Checkable {
	/**
	 * Is called on every run, if no higher prioritized behavior is chosen
	 * @returns the Behavior which should be run or undefined if this Behavior is unfit for execution
	 */
	check(): Behavior | undefined;
	/**
	 * Get this checkable's mainAttackerParameters
	 * @returns a tuple
	 * @returns tuple[0] the actual parameters or undefined if this behavior has not applied
	 * @returns tuple[1] whether this behavior is or contains the active one
	 */
	mainAttackerParameters(activeBehavior?: Behavior): [MainAttackerParameters | undefined, boolean];
	clearMainAttackerParameters(): void;
	/**
	 * This reference is invalidated after one frame since the agent may be
	 * changed. Thus, objects living on the agent can't be taken from the agent
	 * and be cached. The robot() is an exception, since the behavior does not
	 * allow changing to an agent for a different robot.
	 * @see setAgent
	 */
	agent(): Agent;
	/**
	 * Update the agent this checkable belongs to.
	 *
	 * Since hysteresis of checkables nearly always depends on robot
	 * position/speed, its not allowed to update with an agent belonging to a
	 * different robot. Implementors of checkable should check for this case.
	 *
	 * @param agent - The new agent this checkable will belong to
	 */
	setAgent(agent: Agent): void;
}

export abstract class Behavior implements Checkable {
	protected get _messaging(): MessageBox {
		return this._agent.messaging();
	}

	protected _agent: Agent;
	protected _robot: FriendlyRobot;
	protected _task: Task | undefined;
	protected _active: boolean = false;
	protected _forceKeepingInPool: boolean = false;
	// WARNING: when adding state is should be accessed by the subclass, this state has to be copied from and to
	// the deferred behavior, see runDeferredBehavior() and run()

	private _mainAttackerParameters: MainAttackerParameters | undefined = undefined;
	private _deferredBehavior: Behavior | undefined;
	private _deferredBehaviorRunning: boolean = false;

	public constructor(agent: Agent) {
		this._agent = agent;
		this._robot = this._agent.robot();
		this.stop();
	}

	// is called when another behavior is being chosen
	public stop() {
		this._task = undefined; // reset task
		this._active = false;
		this._forceKeepingInPool = false;
		// stopping _deferredBehavior is unnecessary, as it goes out of scope.
		this._deferredBehavior = undefined;
		this._deferredBehaviorRunning = false;
		this._stop();
	}

	public isBehaviour(): boolean {
		return true;
	}

	// override if necessary
	public start() { }

	// when running a deferred behavior the results of this function should then be returned
	// by the main behavior in order to use the task assignment of the deferred behavior
	// a deferred behavior will be terminated as soon as it is not called in at least one frame
	// this function MUST only be called in _updateTask
	public runDeferredBehavior(behavior: BehaviorConstructor, restart: boolean): BaseTaskAssignment | typeof CONTINUE_TASK {
		if (this._deferredBehavior == undefined || !(this._deferredBehavior instanceof behavior) || restart) {
			this._deferredBehavior = new behavior(this._agent);
			this._deferredBehavior.start();
		}
		this._deferredBehaviorRunning = true;
		debug.push("deferred behavior", this._deferredBehavior.constructor.name);
		let result = this._deferredBehavior._updateTask();
		debug.pop();

		// transfer state from deferred behavior to main behavior
		this._forceKeepingInPool = this._deferredBehavior._forceKeepingInPool;
		return result;
	}

	public run() {
		this._deferredBehaviorRunning = false;

		const taskUpdate = this._updateTask();

		if (taskUpdate === CONTINUE_TASK) {
			if (this._task === undefined) {
				// This is not really recoverable
				throw new Error("Trying to continue task while none was selected before");
			}

			return;
		}

		const [bestTask, parameters, forceNewTask] = taskUpdate;
		// terminate the deferred behavior if it has not been run this frame
		if (!this._deferredBehaviorRunning && this._deferredBehavior != undefined) {
			// stopping _deferredBehavior is unnecessary, as it goes out of scope.
			this._deferredBehavior = undefined;
		}
		if (this._task == undefined || !(this._task instanceof bestTask) || forceNewTask) {
			if (parameters != undefined) {
				this._task = new bestTask(this, ...parameters);
			} else {
				this._task = new bestTask(this);
			}
		}
		if (this._deferredBehavior) {
			// transfer state from this behavior to the deferred behavior
			this._deferredBehavior._task = this._task;
			this._deferredBehavior._active = true;
		}
		this._active = true;
	}

	public abstract check(): Behavior | undefined;

	protected forceDeferredKeepingInPool() {
		if (this._deferredBehavior) {
			this._deferredBehavior._forceKeepingInPool = true;
		}
		this._forceKeepingInPool = true;
	}

	public forceKeepingInPool(): boolean {
		return this._deferredBehavior ? this._deferredBehavior.forceKeepingInPool() : this._forceKeepingInPool;
	}

	public task(): Task {
		return <Task> this._task;
	}

	public agent(): Agent {
		return this._agent;
	}

	public setAgent(agent: Agent) {
		// behavior/task hysteresis nearly always relies on robot position, speed etc.
		if (this._robot !== agent.robot()) {
			throw new Error("Can't reuse behavior with different robot");
		}
		this._agent = agent;
	}

	// chooses and returns a task and its parameters
	protected abstract _updateTask(): BaseTaskAssignment | typeof CONTINUE_TASK;

	public applyForMainAttacker(target?: Position, endSpeedLength?: number, overrideRating?: number) {
		this._mainAttackerParameters = [target, endSpeedLength, overrideRating];
	}

	public mainAttackerParameters(activeBehavior?: Behavior): [MainAttackerParameters | undefined, boolean] {
		return [this._mainAttackerParameters, this === activeBehavior];
	}

	public clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	// can be overwritten for custom cleanups
	protected _stop() { }

	/**
	 * Add custom debug info for this behavior.
	 * Will be put in a subtree in the debug tree.
	 */
	public addDebugInfo() {
		debug.set(undefined, this.constructor.name);
	}
}

/**
 * A list of checkables. Forwards `Checkable` operations to the underlying
 * collection
 */
export class CheckableList implements Checkable {
	private _agent: Agent;
	private _checkables: Checkable[];

	public constructor(agent: Agent, checkables: CheckableConstructor[]) {
		this._agent = agent;
		this._checkables = checkables.map((ctor) => new ctor(agent));
	}

	/**
	 * Checks a bunch of sub-checkables in the order supplied in the
	 * constructor and returns the first result different from `undefined`
	 *
	 * @returns the return value of the first checkable, that did not return
	 *          `undefined`, or `undefined` if there is no such checkable
	 */
	public check(): Behavior | undefined {
		for (const checkable of this._checkables) {
			const result = checkable.check();
			if (result) {
				return result;
			}
		}
		return undefined;
	}

	public mainAttackerParameters(activeBehavior?: Behavior): [MainAttackerParameters | undefined, boolean] {
		let params = undefined;
		let active = false;
		for (const checkable of this._checkables) {
			const [checkableParams, isActive] = checkable.mainAttackerParameters(activeBehavior);
			params = checkableParams || params;
			if (isActive) {
				active = true;
				break;
			}
		}
		return [params, active];
	}

	public clearMainAttackerParameters() {
		for (const checkable of this._checkables) {
			checkable.clearMainAttackerParameters();
		}
	}

	public agent() {
		return this._agent;
	}

	public setAgent(agent: Agent) {
		this._agent = agent;
		for (const checkable of this._checkables) {
			checkable.setAgent(agent);
		}
	}
}

