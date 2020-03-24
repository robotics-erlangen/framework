import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { Agent } from "glados/agent/base/agent";
import { MessageBox } from "glados/control/messaging";
import { Task, TaskConstructor, TaskParameters } from "glados/task/base";

export type BaseTaskAssignment = [any, any[]?, boolean?];

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

export abstract class Behavior {
	protected _messaging: MessageBox;

	protected _agent: Agent;
	protected _robot: FriendlyRobot;
	protected _task: Task | undefined;
	protected _active: boolean = false;
	protected _forceKeepingInPool: boolean = false;
	// WARNING: when adding state is should be accessed by the subclass, this state has to be copied from and to
	// the deferred behavior, see runDeferredBehavior() and run()

	private _mainAttackerParameters: [Position | undefined, number | undefined, number | undefined] | undefined = undefined;
	private _deferredBehavior: Behavior | undefined;
	private _deferredBehaviorRunning: boolean = false;

	constructor(agent: Agent) {
		this._agent = agent;
		this._robot = this._agent.robot();
		this._messaging = this._agent.messaging();
		this.stop();
	}

	// is called when another behavior is being chosen
	stop() {
		this._task = undefined; // reset task
		this._active = false;
		this._forceKeepingInPool = false;
		// stopping _deferredBehavior is unnecessary, as it goes out of scope.
		this._deferredBehavior = undefined;
		this._deferredBehaviorRunning = false;
		this._stop();
	}

	isBehaviour(): boolean {
		return true;
	}

	// override if necessary
	start() { }

	// when running a deferred behavior the results of this function should then be returned
	// by the main behavior in order to use the task assignment of the deferred behavior
	// a deferred behavior will be terminated as soon as it is not called in at least one frame
	// this function MUST only be called in _updateTask
	runDeferredBehavior(behavior: typeof Behavior, restart: boolean): BaseTaskAssignment {
		if (this._deferredBehavior == undefined || !(this._deferredBehavior instanceof behavior) || restart) {
			this._deferredBehavior = new (behavior as any)(this._agent);
			(this._deferredBehavior as Behavior).start();
		}
		this._deferredBehaviorRunning = true;
		debug.set("deferred behavior", (this._deferredBehavior as Behavior).constructor.name);
		let result = (this._deferredBehavior as Behavior)._updateTask();

		// transfer state from deferred behavior to main behavior
		this._forceKeepingInPool = this._deferredBehavior!._forceKeepingInPool;
		return result;
	}

	run() {
		this._deferredBehaviorRunning = false;
		let [bestTask, parameters, forceNewTask] = this._updateTask();
		// terminate the deferred behavior if it has not been run this frame
		if (!this._deferredBehaviorRunning && this._deferredBehavior != undefined) {
			// stopping _deferredBehavior is unnecessary, as it goes out of scope.
			this._deferredBehavior = undefined;
		}
		if (this._task == undefined || !(this._task instanceof bestTask) || forceNewTask) {
			if (parameters != undefined) {
				this._task = new (bestTask as any)(this._agent, ...parameters);
			} else {
				this._task = new (bestTask as any)(this._agent);
			}
		}
		if (this._deferredBehaviorRunning) {
			// transfer state from this behavior to the deferred behavior
			this._deferredBehavior!._task = this._task;
			this._deferredBehavior!._active = true;
		}
		this._active = true;
	}

	// is called on every run, if no higher prioritized behavior is chosen
	// return true if behavior is appropriate
	abstract check(): boolean;

	protected forceDeferredKeepingInPool() {
		if (this._deferredBehavior) {
			this._deferredBehavior._forceKeepingInPool = true;
		}
		this._forceKeepingInPool = true;
	}

	forceKeepingInPool(): boolean {
		return this._deferredBehavior ? this._deferredBehavior.forceKeepingInPool() : this._forceKeepingInPool;
	}

	task(): Task {
		return <Task> this._task;
	}

	robot(): FriendlyRobot {
		return this._robot;
	}

	// chooses and returns a task and its parameters
	abstract _updateTask(): BaseTaskAssignment;

	_applyForMainAttacker(target?: Position, endSpeedLength?: number, overrideRating?: number) {
		this._mainAttackerParameters = [ target, endSpeedLength, overrideRating ];
	}

	mainAttackerParameters(): [Position | undefined, number | undefined, number | undefined] | undefined {
		return this._mainAttackerParameters;
	}

	clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	// can be overwritten for custom cleanups
	_stop() { }
}
