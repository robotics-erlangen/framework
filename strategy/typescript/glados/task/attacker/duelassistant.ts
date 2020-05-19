import * as debug from "base/debug";
import * as Geom from "base/geom";
import { FriendlyRobot, Robot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import { head } from "glados/util/collections";


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
		// let messages = this._messaging.receive(MessageType.defendedOpponent);
		let messages = this._messaging.receive(MessageType.dueledOpponent, true);
		const duelInfo = head(messages);
		if (duelInfo) {
			const [duelist, opponent] = duelInfo;
			this._duelist = duelist;
			this._opponent = opponent;
		}
	}

	run() {
		const HYSTERESIS_DISTANCE = 0.3;
		const HYSTERESIS_BASELINE = 0.5;
		const HYSTERESIS_ORTHOGONAL_DISTANCE = 0.2 * this._robot.radius;
		const HYSTERESIS_ANGLE = 7 * Math.PI / 180;
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
		let totalOffset : Vector = duelVector.complexMultiplication(Vector.fromAngle(angleOffset)).withLength(3 * this._robot.radius);

		let agressivePositionMode = this._lastPositionMode;
		let angleDiff = Math.abs(Geom.normalizeAngle(World.Geometry.FriendlyGoal.angle() - opponentDir));

		if (angleDiff < Math.PI / 2) {
			let intersection = Geom.intersectLineLine(opponentPos, Vector.fromAngle(opponentDir), World.Geometry.FriendlyGoal, new Vector(1,0))[0];
			if (intersection === undefined || Math.abs(intersection.x) > World.Geometry.FieldWidthHalf + HYSTERESIS_BASELINE) {
				agressivePositionMode = true;
			} else if (Math.abs(intersection.x) < World.Geometry.FieldWidthHalf - HYSTERESIS_BASELINE) {
				agressivePositionMode = false;
			}
		} else {
			agressivePositionMode = true;
		}

		for (let robot of World.FriendlyRobots) {
			let robotPos = robot.pos;
			let orthogonalDistance = robotPos.orthogonalDistance(opponentPos, opponentPos + Vector.fromAngle(opponentDir));
			orthogonalDistance += this._lastPositionMode ? HYSTERESIS_ORTHOGONAL_DISTANCE : -HYSTERESIS_ORTHOGONAL_DISTANCE;
			let distance = robotPos.distanceTo(opponentPos);
			distance += this._lastPositionMode ? HYSTERESIS_ORTHOGONAL_DISTANCE : -HYSTERESIS_ORTHOGONAL_DISTANCE;
			let duelAngleDiff = Math.abs((-duelVector).angle() - opponentDir);
			duelAngleDiff += this._lastPositionMode ? HYSTERESIS_ANGLE : -HYSTERESIS_ANGLE;
			if (orthogonalDistance <= robot.radius && distance <= 5 * robot.radius && duelAngleDiff <= 70 * Math.PI / 180) {
				agressivePositionMode = false;
			}
		}

		this._lastPositionMode = agressivePositionMode;

		debug.push("duelAssistant");
		debug.set("agressivePositionMode", agressivePositionMode);
		debug.pop();

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
