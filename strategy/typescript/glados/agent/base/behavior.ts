import * as debug from "base/debug";
import {Position} from "base/vector";
import {FriendlyRobot} from "base/robot";
import {Agent} from "glados/agent/base/agent";
import {MessageBox, MessageType} from "glados/control/messaging";
import {Task} from "glados/task/base";

export abstract class Behavior {
	_agent: Agent;
	_robot: FriendlyRobot;
	_messaging: MessageBox;
	_mainAttackerParameters: [Position, number, number | undefined] | undefined = undefined;
	_task: Task | undefined;
	_active: boolean = false;
	_forceKeepingInPool: boolean = false;
	_deferredBehavior: Behavior | undefined;
	_deferredBehaviorRunning: boolean = false;

	constructor (agent: Agent) {
		this._agent = agent;
		this._robot = this._agent.robot();
		this._messaging = agent._messaging;
		this.stop();
	}

	// is called when another behavior is being chosen
	stop () {
		this._task = undefined; // reset task
		this._active = false;
		this._forceKeepingInPool = false;
		//stopping _deferredBehavior is unnecessary, as it goes out of scope.
		this._deferredBehavior = undefined;
		this._deferredBehaviorRunning = false;
		this._stop();
	}

	isBehaviour(): boolean {
		return true;
	}

	//override if necessary
	start () { }

	// when running a deferred behavior the results of this function should then be returned
	// by the main behavior in order to use the task assignment of the deferred behavior
	// a deferred behavior will be terminated as soon as it is not called in at least one frame
	// this function MUST only be called in _updateTask
	runDeferredBehavior (behavior: typeof Behavior, restart: boolean):
			[typeof Task, any[] | undefined, boolean | undefined] {
		if (this._deferredBehavior == undefined || !(this._deferredBehavior instanceof behavior) || restart) {
			this._deferredBehavior = new (behavior as any)(this._agent);
			(this._deferredBehavior as Behavior).start();
		}
		this._deferredBehaviorRunning = true;
		debug.set("deferred behavior", (this._deferredBehavior as Behavior).constructor.name);
		return (this._deferredBehavior as Behavior)._updateTask();
	}

	run () {
		this._deferredBehaviorRunning = false;
		let [bestTask, parameters, forceNewTask] = this._updateTask();
		// terminate the deferred behavior if it has not been run this frame
		if (!this._deferredBehaviorRunning && this._deferredBehavior != undefined) {
			//stopping _deferredBehavior is unnecessary, as it goes out of scope.
			this._deferredBehavior = undefined;
		}
		if (this._task == undefined || !(this._task instanceof bestTask) || forceNewTask) {
			if (parameters != undefined) {
				this._task = new (bestTask as any)(this._agent, ...parameters);
			} else {
				this._task = new (bestTask as any)(this._agent);
			}
		}
		this._active = true;
	}

	// is called on every run, if no higher prioritized behavior is chosen
	// return true if behavior is appropriate
	abstract check (): boolean;

	forceKeepingInPool (): boolean {
		return this._deferredBehavior ? this._deferredBehavior.forceKeepingInPool() : this._forceKeepingInPool;
	}

	task (): Task {
		return <Task>this._task;
	}

	robot (): FriendlyRobot {
		return this._robot;
	}

	// chooses and returns a task and its parameters
	abstract _updateTask (): [typeof Task, any[] | undefined, boolean | undefined];

	_applyForMainAttacker (target: Position, endSpeedLength: number, overrideRating?: number) {
		this._mainAttackerParameters = [ target, endSpeedLength, overrideRating ];
	}

	mainAttackerParameters (): [Position, number, number | undefined] | undefined {
		return this._mainAttackerParameters;
	}

	clearMainAttackerParameters () {
		this._mainAttackerParameters = undefined;
	}

	// can be overwritten for custom cleanups
	_stop () { }
}