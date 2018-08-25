import * as World from "base/world";
import {Robot} from "base/robot";
import {MessageType} from "glados/control/messaging";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";
import {Task, Agent} from "glados/task/base";

export class Piggy extends Task {
	private _targetRobot: Robot;

	constructor(agent: Agent, targetRobot: Robot) {
		super(agent);
		if (targetRobot == undefined) {
			throw new Error("Piggy task needs a target robot");
		}
		this._targetRobot = targetRobot;
	}

	run () {
		let obstacleTable = { messaging: this._messaging};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		let piggyPos = UtilDefense.piggyPos(this._targetRobot);

		this._messaging.sendBroadcast(MessageType.moveDest, piggyPos);

		let dir = (World.Ball.pos - this._targetRobot.pos).angle();
		this._robot.trajectory.update(ToTarget, piggyPos, dir, undefined, this._targetRobot.speed);
	}
}