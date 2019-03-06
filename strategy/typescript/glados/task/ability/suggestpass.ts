import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
import { MessageBox, MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";

export class SuggestPass {
	_robot: FriendlyRobot;
	_messaging: MessageBox;

	constructor(robot: FriendlyRobot, messaging: MessageBox) {
		this._robot = robot;
		this._messaging = messaging;
	}

	_suggestPass(destBallPos: Position, attackPos: Position = World.Ball.pos,
			relativeTime?: number, anonymous: boolean = false, chip: boolean = false) {
		// check for mainAttacker
		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		if (mainAttacker == undefined) {
			return;
		}

		let currentBallPos = attackPos;
		let robotPos = destBallPos + (destBallPos - currentBallPos).setLength(this._robot.shootRadius + World.Ball.radius);

		// calculate receive time
		let extraTime = 0.0;
		let moveTime = relativeTime || Physics.robotTimeToPos(this._robot, robotPos, new Vector(0, 0))[0] + extraTime;
		let receiveTime = World.Time + moveTime;

		vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true);
		vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true);

		anonymous = anonymous || false;
		this._messaging.sendBroadcast(MessageType.passSuggestion,
			{ ballPos: destBallPos, time: receiveTime , anonymous: anonymous, chip: chip, manual: false});
	}

	_suggestPassRobotPosition(destRobotPos: Position, attackPos: Position = World.Ball.pos, relativeTime?: number,
			anonymous?: boolean) {
		let destBallPos = destRobotPos + (attackPos - destRobotPos).setLength(this._robot.shootRadius + World.Ball.radius);
		this._suggestPass(destBallPos, attackPos, relativeTime, anonymous);
	}
}
