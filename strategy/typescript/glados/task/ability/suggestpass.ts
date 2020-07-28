import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { Task } from "glados/task/base";

export class SuggestPass {
	_robot: FriendlyRobot;
	_task: Task;

	private get _messaging() {
		return this._task.behavior().agent().messaging();
	}

	constructor(task: Task) {
		this._robot = task.behavior().agent().robot();
		this._task = task;
	}

	_suggestPass(destBallPos: Position, attackPos: Position = World.Ball.pos,
			relativeTime?: number, anonymous: boolean = false, chip: boolean = false) {
		// check for mainAttacker
		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		if (mainAttacker == undefined) {
			return;
		}

		let currentBallPos = attackPos;
		let robotPos = destBallPos + (destBallPos - currentBallPos).withLength(this._robot.shootRadius + World.Ball.radius);

		// calculate receive time
		let extraTime = 0.0;
		let moveTime = relativeTime != undefined ? relativeTime : Physics.robotTimeToPos(this._robot, robotPos, new Vector(0, 0))[0] + extraTime;
		let receiveTime = World.Time + moveTime;

		vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true);
		vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true);

		anonymous = anonymous || false;
		this._messaging.sendBroadcast(MessageType.passSuggestion,
			{ ballPos: destBallPos, time: receiveTime , anonymous: anonymous, chip: chip, manual: false});
	}

	_suggestPassRobotPosition(destRobotPos: Position, attackPos: Position = World.Ball.pos, relativeTime?: number,
			anonymous?: boolean) {
		let destBallPos = destRobotPos + (attackPos - destRobotPos).withLength(this._robot.shootRadius + World.Ball.radius);
		this._suggestPass(destBallPos, attackPos, relativeTime, anonymous);
	}
}
