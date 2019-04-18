import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";

import { Behavior } from "glados/agent/base/behavior";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Task } from "glados/task/base";

export { MessageBox } from "glados/control/messaging";

export type Assignment = {
	class: any,
	params?: any[],
	restart?: boolean
} | {
	behavior: any,
	params?: any[],
	restart?: boolean
};

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

	public abstract static canStart(): boolean;
	public abstract _canContinue(): boolean;
	protected abstract _updateTasks(): MoveParameters;
}
