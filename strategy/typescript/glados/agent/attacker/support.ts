import * as debug from "base/debug";

import { Agent } from "glados/agent/base/agent";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { SideStep } from "glados/task/attacker/sidestep";
import { Support as SupportTask, SupportParameters } from "glados/task/attacker/support";
import * as Attack from "glados/util/attack";

/**
 * The default attacker behavior.
 *
 * It will participate in the support group and accept passes if necessary.
 */
export class Support extends Behavior {
	_forceKeepingInPool: boolean = false;
	_supportParams: SupportParameters;

	/**
	 * Construct a new instance.
	 *
	 * @param agent - The agent this behavior will initially belong to
	 * @param supportParams - Parameters to parameterize the {@link Support} task with
	 */
	constructor(agent: Agent, supportParams: SupportParameters) {
		super(agent);
		this._supportParams = supportParams;
	}

	addDebugInfo() {
		debug.set(undefined, "Default");
		debug.set("Sampling", this._supportParams.samplingCtor.name);
	}

	_stop() {
		this._forceKeepingInPool = false;
	}

	check(): Behavior {
		this._forceKeepingInPool = false;
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				if (passInfo && passInfo.target === this._robot) {
					this._forceKeepingInPool = true;
				}
			}
		}

		return this;
	}

	_updateTask(): TaskAssignment<typeof SideStep> | TaskAssignment<typeof AcceptPass> | TaskAssignment<typeof SupportTask> {
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let relevantPassInfo = passInfoTable ? Attack.relevantPassInfoMessage(this._robot, passInfoTable) : undefined;
		let prevRobotTime = (this._task instanceof AcceptPass) ? (this._task as AcceptPass).getLastTime() : undefined;
		let [acceptingPass, timeLeft] = passInfoTable ? Attack.checkPassInfos(this._robot, passInfoTable, false, prevRobotTime) : [false, undefined];

		if (relevantPassInfo && !acceptingPass) {
			if (this._task instanceof SideStep) {
				(this._task as SideStep).updateTime(timeLeft);
			}
			return [SideStep, [relevantPassInfo, timeLeft]];
		}
		if (acceptingPass) {
			return [AcceptPass];
		}
		return [SupportTask, [this._supportParams]];
	}
}
