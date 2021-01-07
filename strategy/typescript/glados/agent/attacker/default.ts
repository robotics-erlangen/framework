import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { Midfield } from "glados/task/attacker/midfield";
import { SideStep } from "glados/task/attacker/sidestep";
import { Striker } from "glados/task/attacker/striker";
import * as Attack from "glados/util/attack";

export class Default extends Behavior {
	_forceKeepingInPool: boolean = false;

	_stop() {
		this._forceKeepingInPool = false;
	}

	check(): boolean {
		this._forceKeepingInPool = false;
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				if (passInfo && passInfo.target === this._robot) {
					this._forceKeepingInPool = true;
				}
			}
		}

		return true;
	}

	_updateTask(): TaskAssignment<typeof SideStep> | TaskAssignment<typeof AcceptPass> | TaskAssignment<typeof Midfield> | TaskAssignment<typeof Striker> {
		this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "midfield" });

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
		let midfieldZone = this._messaging.receiveTrainer(MessageType.midfieldZone);
		if (midfieldZone) {
			return [Midfield];
		}
		return [Striker];
	}
}
