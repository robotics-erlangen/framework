import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { Agent } from "glados/agent/base/agent";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Agent as AgentForTask, Task } from "glados/task/base";

// this series of type expression generate all possible constructor types for a given task class as a tuple
type AnyClass = new (...args: any[]) => any;

type TaskType1<T extends AnyClass> = T extends new (a1: AgentForTask) => any ? undefined | [] | [undefined] : [never];
type TaskType2<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2) => any ? [R2] | TaskType1<T> : TaskType1<T>;
type TaskType3<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3) => any ? [R2, R3] | TaskType2<T> : TaskType2<T>;
type TaskType4<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4) => any ? [R2, R3, R4] | TaskType3<T> : TaskType3<T>;
type TaskType5<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5) => any ? [R2, R3, R4, R5] | TaskType4<T> : TaskType4<T>;
type TaskType6<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6) => any ? [R2, R3, R4, R5, R6] | TaskType5<T> : TaskType5<T>;
type TaskType7<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7) => any ? [R2, R3, R4, R5, R6, R7] | TaskType6<T> : TaskType6<T>;
type TaskType8<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8) => any ? [R2, R3, R4, R5, R6, R7, R8] | TaskType7<T> : TaskType7<T>;
type TaskType9<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9) => any ? [R2, R3, R4, R5, R6, R7, R8, R9] | TaskType8<T> : TaskType8<T>;
type TaskType10<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10] | TaskType9<T> : TaskType9<T>;
type TaskType11<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11] | TaskType10<T> : TaskType10<T>;
type TaskType12<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12] | TaskType11<T> : TaskType11<T>;
type TaskType13<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13] | TaskType12<T> : TaskType12<T>;
type TaskType14<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14] | TaskType13<T> : TaskType13<T>;
type TaskType15<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14, a15: infer R15) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15] | TaskType14<T> : TaskType14<T>;
type TaskType16<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14, a15: infer R15, a16: infer R16) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16] | TaskType15<T> : TaskType15<T>;
type TaskType17<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14, a15: infer R15, a16: infer R16, a17: infer R17) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17] | TaskType16<T> : TaskType16<T>;
type TaskType18<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14, a15: infer R15, a16: infer R16, a17: infer R17, a18: infer R18) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18] | TaskType17<T> : TaskType17<T>;
type TaskType19<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14, a15: infer R15, a16: infer R16, a17: infer R17, a18: infer R18, a19: infer R19) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19] | TaskType18<T> : TaskType18<T>;
type TaskType20<T extends AnyClass> = T extends new (a1: AgentForTask, a2: infer R2, a3: infer R3, a4: infer R4, a5: infer R5, a6: infer R6, a7: infer R7, a8: infer R8, a9: infer R9, a10: infer R10, a11: infer R11, a12: infer R12, a13: infer R13, a14: infer R14, a15: infer R15, a16: infer R16, a17: infer R17, a18: infer R18, a19: infer R19, a20: infer R20) => any ? [R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20] | TaskType19<T> : TaskType19<T>;

type ExactLengthType1<T extends AnyClass> = T extends new (a1: any, a2: Error) => any ? TaskType1<T> : TaskType2<T>;
type ExactLengthType2<T extends AnyClass> = T extends new (a1: any, a2: any, a3: Error) => any ? ExactLengthType1<T> : TaskType3<T>;
type ExactLengthType3<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: Error) => any ? ExactLengthType2<T> : TaskType4<T>;
type ExactLengthType4<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: Error) => any ? ExactLengthType3<T> : TaskType5<T>;
type ExactLengthType5<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: Error) => any ? ExactLengthType4<T> : TaskType6<T>;
type ExactLengthType6<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: Error) => any ? ExactLengthType5<T> : TaskType7<T>;
type ExactLengthType7<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: Error) => any ? ExactLengthType6<T> : TaskType8<T>;
type ExactLengthType8<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: Error) => any ? ExactLengthType7<T> : TaskType9<T>;
type ExactLengthType9<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: Error) => any ? ExactLengthType8<T> : TaskType10<T>;
type ExactLengthType10<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: Error) => any ? ExactLengthType9<T> : TaskType11<T>;
type ExactLengthType11<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: Error) => any ? ExactLengthType10<T> : TaskType12<T>;
type ExactLengthType12<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: Error) => any ? ExactLengthType11<T> : TaskType13<T>;
type ExactLengthType13<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: Error) => any ? ExactLengthType12<T> : TaskType14<T>;
type ExactLengthType14<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: Error) => any ? ExactLengthType13<T> : TaskType15<T>;
type ExactLengthType15<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: any, a16: Error) => any ? ExactLengthType14<T> : TaskType16<T>;
type ExactLengthType16<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: any, a16: any, a17: Error) => any ? ExactLengthType15<T> : TaskType17<T>;
type ExactLengthType17<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: any, a16: any, a17: any, a18: Error) => any ? ExactLengthType16<T> : TaskType18<T>;
type ExactLengthType18<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: any, a16: any, a17: any, a18: any, a19: Error) => any ? ExactLengthType17<T> : TaskType19<T>;
type ExactLengthType19<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: any, a16: any, a17: any, a18: any, a19: any, a20: Error) => any ? ExactLengthType18<T> : TaskType20<T>;
type ExactLengthType20<T extends AnyClass> = T extends new (a1: any, a2: any, a3: any, a4: any, a5: any, a6: any, a7: any, a8: any, a9: any, a10: any, a11: any, a12: any, a13: any, a14: any, a15: any, a16: any, a17: any, a18: any, a19: any, a20: any, a21: Error) => any ? ExactLengthType19<T> : Error;

export type TaskAssignment<T extends AnyClass> = [T, ExactLengthType20<T>?, boolean?];
export type BaseTaskAssignment = [any, any[]?, boolean?];

class Pass {
	constructor(agent: AgentForTask, targetRobot?: FriendlyRobot, targetPos?: Position, chip?: boolean,
			ballReceiptPos?: Position) {
		//
	}
}
let a: ExactLengthType20<typeof Pass>;

export abstract class Behavior {
	public _messaging: MessageBox;

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
		this._messaging = agent._messaging;
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
