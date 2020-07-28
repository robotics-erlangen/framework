import { Robot } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";

export class Piggy extends Task {
	private _targetRobot: Robot;
	private _suggestPass: SuggestPass;

	constructor(behavior: Behavior, targetRobot: Robot) {
		super(behavior);
		if (targetRobot == undefined) {
			throw new Error("Piggy task needs a target robot");
		}
		this._targetRobot = targetRobot;
		this._suggestPass = new SuggestPass(this._robot, this._messaging);
	}

	run() {
		const obstacleTable = { task: this };
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		let piggyPos = UtilDefense.piggyPos(this._targetRobot);

		this._messaging.sendBroadcast(MessageType.moveDest, piggyPos);

		// Request pass to position opposite of you
		let requestedPassPos = piggyPos + (piggyPos - this._targetRobot.pos).withLength(0.3);

		vis.addCircle("piggy/requestedPass", requestedPassPos, 0.1);

		let passTime = Physics.robotTimeToPos(this._robot, piggyPos, new Vector(0,0));
		this._suggestPass._suggestPass(requestedPassPos, World.Ball.pos, passTime[0]);

		let dir = (World.Ball.pos - this._targetRobot.pos).angle();
		this._robot.trajectory.update(ToTarget, piggyPos, dir, undefined, this._targetRobot.speed);
	}
}
