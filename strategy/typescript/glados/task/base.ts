import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";

import { MessageBox } from "glados/control/messaging";

type MainAttackerParameters = [Position, number];

/**
 * A constructor that creates a task.
 *
 * Tasks always take an agent from their owning behavior, thus an agent is
 * mandatory as first argument.
 */
export type TaskConstructor = new (agent: Agent, ...args: any[]) => Task;

/** The parameters needed to construct a task, excluding the mandatory agent */
export type TaskParameters<T extends TaskConstructor> =
	// This conditional is always true since T extends TaskConstructor
	T extends new (agent: Agent, ...args: infer P) => Task
	? P
	: never;

export interface Agent {
	isAgent(): boolean;
	_messaging: MessageBox;
	robot(): FriendlyRobot;
	_activeBehavior: any;
}

export abstract class Task {
	_agent: Agent;
	_robot: FriendlyRobot;
	_messaging: MessageBox;
	_mainAttackerParameters: MainAttackerParameters | undefined;


	constructor(agent: Agent) {
		this._agent = agent;
		this._robot = agent.robot();
		this._messaging = agent._messaging;
		this.clearMainAttackerParameters();
	}

	robot() {
		return this._robot;
	}

	abstract run(): void;

	// use for type stubs, to avoid cyclic imports
	isTask(): boolean {
		return true;
	}

	clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	capturedSetMAParams(): (target: Position, endSpeedLength: number) => void {
		// tslint:disable-next-line
		let outerThis = this;
		return function(target: Position, endSpeedLength: number) {
			outerThis.setMainAttackerParameters(target, endSpeedLength);
		};
	}

	setMainAttackerParameters(target: Position, endSpeedLength: number) {
		this._mainAttackerParameters = [ target, endSpeedLength ];
	}

	mainAttackerParameters(): MainAttackerParameters | undefined {
		return this._mainAttackerParameters;
	}
}
