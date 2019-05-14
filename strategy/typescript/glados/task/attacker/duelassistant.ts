import { FriendlyRobot, Robot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class DuelAssistant extends Task {
	private _duelist: FriendlyRobot | undefined = undefined;
	private _opponent: Robot | undefined = undefined;
	private _hyst: number = 0;

	private _suggestPass: SuggestPass;

	constructor(agent: Agent) {
		super(agent);
		this._update();
		if (this._duelist == undefined || this._opponent == undefined) {
			throw new Error("there is no duel to assist");
		}
		this._suggestPass = new SuggestPass(this._robot, this._messaging);
	}

	private _update() {
		let duelist, opponent;
		let messages = this._messaging.receive(MessageType.defendedOpponent);
		if (messages.size > 0) {
			[duelist, opponent] = messages.entries().next().value;
		}
		this._duelist = duelist || this._duelist;
		this._opponent = opponent || this._opponent;
	}

	run() {
		const HYSTERESIS_DISTANCE = 0.3;
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, {messaging: this._messaging});
		this._update();
		let angleOffset = Math.PI / 2;
		let ballPos = World.Ball.pos;
		if (Math.abs(ballPos.x) > this._hyst) {
			this._hyst = HYSTERESIS_DISTANCE;
			let sign = ballPos.x > 0 ? 1 : -1;
			angleOffset = sign * (Math.PI / 2);
		}
		let friendlyPos = this._duelist!.pos;
		let opponentPos = this._opponent!.pos;
		let duelVector = opponentPos - friendlyPos;
		let totalOffset = duelVector.complexMultiplication(Vector.fromAngle(angleOffset)).setLength(3 * this._robot.radius);
		let pos = friendlyPos + totalOffset;
		let viewDir = duelVector.angle();
		this._suggestPass._suggestPassRobotPosition(pos + duelVector);
		this._robot.trajectory.update(ToTarget, pos, viewDir);
	}
}
