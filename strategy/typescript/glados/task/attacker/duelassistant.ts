import * as Geom from "base/geom";
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
	private _lastPositionMode = false;
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
		// let messages = this._messaging.receive(MessageType.defendedOpponent);
		let messages = this._messaging.receive(MessageType.dueledOpponent, true);
		if (messages.size > 0) {
			[duelist, opponent] = messages.entries().next().value;
		}
		this._duelist = duelist || this._duelist;
		this._opponent = opponent || this._opponent;
	}

	run() {
		const HYSTERESIS_DISTANCE = 0.3;
		const HYSTERESIS_BASELINE = 0.5;
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, {messaging: this._messaging});
		this._update();
		let angleOffset = Math.PI / 2;
		let ballPos = World.Ball.pos;
		if (Math.abs(ballPos.x) > this._hyst) {
			this._hyst = HYSTERESIS_DISTANCE;
			let sign = ballPos.x > 0 ? 1 : -1;
			angleOffset = sign * (Math.PI / 2);
		}
		let friendlyPos : Vector = this._duelist!.pos;
		let opponentPos : Vector = this._opponent!.pos;
		let opponentDir : number = this._opponent!.dir;
		let duelVector : Vector = opponentPos - friendlyPos;
		let totalOffset : Vector = duelVector.complexMultiplication(Vector.fromAngle(angleOffset)).scaleLength(3 * this._robot.radius);

		let agressivePositionMode = this._lastPositionMode;
		let angleDiff = Math.abs(Geom.normalizeAngle(World.Geometry.FriendlyGoal.angle() - opponentDir));

		if (angleDiff < Math.PI / 2) {
			let intersection = Geom.intersectLineLine(friendlyPos, Vector.fromAngle(opponentDir), World.Geometry.FriendlyGoal, new Vector(1,0))[0];
			if (Math.abs(intersection!.x) > World.Geometry.FieldWidthHalf + HYSTERESIS_BASELINE) {
				agressivePositionMode = true;
			} else if (Math.abs(intersection!.x) < World.Geometry.FieldWidthHalf - HYSTERESIS_BASELINE) {
				agressivePositionMode = false;
			}
		} else {
			agressivePositionMode = true;
		}

		this._lastPositionMode = agressivePositionMode;

		let pos : Vector;
		if (agressivePositionMode) {
			pos = opponentPos + (Vector.fromAngle(opponentDir)).scaleLength(3 * this._robot.radius);
		} else {
			pos = friendlyPos + totalOffset;
		}

		let viewDir = duelVector.angle();
		this._suggestPass._suggestPassRobotPosition(pos + duelVector);
		this._robot.trajectory.update(ToTarget, pos, viewDir);
	}
}
