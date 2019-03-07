import * as debug from "base/debug";
import * as Field from "base/field";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as ObserverShoot from "glados/observer/shoot";
import { ShootGoal } from "glados/task/attacker/shootgoal";
import { ChipToPos } from "glados/task/shared/chiptopos";
import { Pass } from "glados/task/shared/pass";
import * as Attack from "glados/util/attack";
import * as ShootGoalUtil from "glados/util/shootgoal";

const G = World.Geometry;

const ENABLE_PSEUDO_PASS = true;
const MIN_PASS_RATING = 0.3;

type Decision = {
	target: FriendlyRobot;
	time: number;
	task: "pass";
	pos: Position;
	quality: "clean" | "fallback";
} | {
	task: "none";
} | {
	task: "shootgoal";
	pos: Position;
	quality: "clean" | "fallback";
} | {
	task: "chipToPos";
	pos: Position;
	time: number;
	quality: "clean" | "fallback";
};

export class Shoot extends Behavior {
	private _nextDecisionTime: number = World.Time;
	private _decision: Decision = { task: "none" };
	private _prevPassPos: Position | undefined = undefined;
	private _attackPosition: Position | undefined = undefined;
	private _prevAttackPosition: Position | undefined = undefined;
	private _activeFrames: number = 0;
	private _lastIncomingPassInfoPos: Position | undefined = undefined;
	private _hadBallCounter: number = 0;
	private _touchedBall: boolean = false;
	private _wasPressed: boolean = false;
	private _manualFlag: boolean = false;

	_stop() {
		this._nextDecisionTime = World.Time;
		this._decision = { task: "none" };

		this._prevPassPos = undefined;

		this._attackPosition = undefined;
		this._prevAttackPosition = undefined;

		this._activeFrames = 0;

		this._lastIncomingPassInfoPos = undefined;

		this._hadBallCounter = 0;
		this._touchedBall = false;

		this._wasPressed = false;

		this._manualFlag = false;
	}

	public check(): boolean {
		return this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
	}

	private static _shootGoalPossible(robot: FriendlyRobot, attackPosition: Position | undefined): [boolean, number | undefined] {
		let [sg_target, angle, sg_dirty] = ShootGoalUtil.updateTarget(robot, undefined, false, attackPosition);

		if (sg_dirty) {
			return [false, angle];
		}

		if (World.Ball.speed.length() > 1.2) {
			return [ObserverShoot.volleyPossible(robot, sg_target), undefined];
		}

		if (attackPosition != undefined && Field.distanceToOpponentDefenseArea(attackPosition, 0) > 1
				&& Robot.isPressed(robot, attackPosition)) {
			return [false, angle];
		}

		return [true, angle];
	}

	private _checkForManualAlly() {
		this._manualFlag = false;
		for (let [sender, passSuggestion] of this._messaging.receive(MessageType.passSuggestion).entries()) {
			if (passSuggestion.manual) {
				this._manualFlag = true;
				this._decision = {
					task: "pass",
					target: sender,
					pos: passSuggestion.ballPos,
					time: passSuggestion.time,
					quality: "clean"
				};
			}
		}
	}

	private _decide(): Decision {
		this._wasPressed = Robot.isPressed(this._robot);

		// perform clean goal shots if possible
		if (Shoot._shootGoalPossible(this._robot, this._attackPosition)[0]) {
			return {
				task: "shootgoal",
				pos: World.Geometry.OpponentGoal,
				quality: "clean"
			};
		}

		let pass = Attack.choosePassFromSuggestions(this._robot,
			this._messaging.receive(MessageType.passSuggestion), this._prevPassPos, true)[0];

		// consider chipping forward
		let passRating = pass ? Attack.ratePass(this._robot, pass, true) : 0;
		if (ENABLE_PSEUDO_PASS && this._attackPosition && passRating < MIN_PASS_RATING
				&&  Field.distanceToDefenseAreaSq(this._attackPosition, false) > 2
				&&  World.Ball.speed.length() < 1
				&&  Math.abs(this._attackPosition.y) < 5 / 6 * G.FieldWidthHalf) {

			let MIN_DISTANCE = 0.1;
			let MAX_DISTANCE = 0.5;
			let DISTANCE_STEP = 0.1;

			let CONE_WIDTH = 90 / 180 * Math.PI;
			let ANGLE_STEP = 15 / 180 * Math.PI;

			let OPPONENT_DISTANCE_THRESHOLD = 1;

			// look for close opponents
			let closestOppDist = Infinity;
			for (let opp of World.OpponentRobots) {
				let toGoal = (G.OpponentGoal - this._attackPosition).setLength((MAX_DISTANCE - MIN_DISTANCE) / 2 + MIN_DISTANCE);
				let newAttackPosition = this._attackPosition + toGoal;
				let oppDist = opp.pos.distanceToSq(newAttackPosition);
				if (oppDist < closestOppDist) {
					closestOppDist = oppDist;
				}
			}

			if (closestOppDist >= OPPONENT_DISTANCE_THRESHOLD) {
				let attackAngle = (G.OpponentGoal - this._attackPosition).angle();
				let bestRating = passRating;

				let bestFreeAngle = 0;
				let bestAttackPosition = undefined;
				for (let dist = MIN_DISTANCE;dist <= MAX_DISTANCE;dist += DISTANCE_STEP) {
					for (let angle = -CONE_WIDTH / 2;angle <= CONE_WIDTH / 2;angle += ANGLE_STEP) {
						// check for possible goalshot opportunity
						let newAttackPosition = this._attackPosition + Vector.fromAngle(attackAngle + angle).setLength(dist);
						let [possible, freeAngle] = Shoot._shootGoalPossible(this._robot, newAttackPosition);
						if (possible && freeAngle != undefined && freeAngle > bestFreeAngle) {
							bestFreeAngle = freeAngle;
							bestAttackPosition = newAttackPosition;
						}

						// look for better pass opportunities
						let newPass = Attack.choosePassFromSuggestions(this._robot,
							this._messaging.receive(MessageType.passSuggestion), this._prevPassPos, true)[0];
						let newPassRating = newPass ? Attack.ratePass(this._robot, newPass, true) : 0;

						if (newPassRating > bestRating && newPassRating > MIN_PASS_RATING) {
							bestRating = newPassRating;
							pass = {target: this._robot, ballPos: newAttackPosition, time: World.Time};
						}
					}
				}

				// goalshot opportunity
				if (bestAttackPosition != undefined) {
					let passVector = bestAttackPosition - this._attackPosition;
					if (Attack.isPassAllowed(this._attackPosition, this._attackPosition + passVector.setLength(0.5))) {
						return {
							task: "pass",
							target: this._robot,
							pos: this._attackPosition + passVector.setLength(0.5),
							time: World.Time,
							quality: "clean"
						};
					}
				}

				// short chip forward
				if (pass == undefined || Attack.ratePass(this._robot, pass, true) < MIN_PASS_RATING) {
					let newAttackPosition = this._attackPosition + Vector.fromAngle(attackAngle).setLength((MAX_DISTANCE - MIN_DISTANCE) / 2 + MIN_DISTANCE);
					let passVector = newAttackPosition - this._attackPosition;
					if (Attack.isPassAllowed(this._attackPosition, this._attackPosition + passVector.setLength(0.5))) {
						return {
							task: "pass",
							target: this._robot,
							pos: this._attackPosition + passVector.setLength(0.5),
							time: World.Time,
							quality: "clean"
						};
					}
				}
			}
		}

		if (pass != undefined && Attack.isPassAllowed(this._attackPosition || World.Ball.pos, pass.ballPos)) {
			return {
				task: "pass",
				target: pass.target!,
				pos: pass.ballPos,
				time: pass.time,
				quality: "clean"
			};
		}

		// try to chip through opponent defense area
		let attackPosition = this._attackPosition || World.Ball.pos;
		if (attackPosition && attackPosition.y > G.FieldHeightHalf - G.DefenseHeight) {
			return {
				task: "chipToPos",
				pos: new Vector(0, G.FieldHeightHalf - 0.5 * G.DefenseHeight),
				time: World.Time,
				quality: "clean"
			};
		}

		// fallback to shoot goal
		return {
			task: "shootgoal",
			pos: World.Geometry.OpponentGoal,
			quality: "fallback"
		};
	}

	private _redeciding(): boolean {

		if (Ball.wasShot(0.25)) {
			this._hadBallCounter = 0;
		}

		if (Robot.touchedBall(this._robot, 0)) {
			this._touchedBall = true;
		}

		if (this._manualFlag) {
			debug.set("redeciding", "FALSE (manual)");
			return false;
		}

		// always redecide if no decision has been made yet
		if (this._activeFrames < 2 || this._decision.task === "none") {
			debug.set("redeciding", "TRUE (initial)");
			return true;
		}

		// redecide if during a pseudo pass, the ball overtakes the pass pos
		// this is moderately likely to happen during chaseBall
		if (ENABLE_PSEUDO_PASS && this._decision.task === "pass" && this._decision.target === this._robot) {
			let attackPosition = this._attackPosition || World.Ball.pos;
			let passVector = (this._decision.pos - attackPosition).setLength(0.4);

			let upperAngle = (new Vector(-G.FieldWidthHalf, G.FieldHeightHalf) - attackPosition).angle();
			let lowerAngle = (new Vector(G.FieldWidthHalf, G.FieldHeightHalf) - attackPosition).angle();
			let passAngle = passVector.angle();

			if (World.Ball.pos.distanceToSq(this._decision.pos) < 0.2 * 0.2 || (passAngle < upperAngle && passAngle > lowerAngle)) {
				debug.set("redeciding", "TRUE (passPos overtaken)");
				return true;
			}
		}

		// never redecide if the ball is imminent
		let dribblerPos = this._robot.pos + (World.Ball.pos - this._robot.pos).setLength(
			World.Ball.radius + this._robot.shootRadius);
		if (Ball.receivesPass(this._robot) && Physics.checkedBallRollTime(World.Ball, dribblerPos) < 0.5) {
			debug.set("redeciding", "FALSE (imminent)");
			return false;
		}

		// redecide if rebound
		if (this._touchedBall && this._hadBallCounter > 5 && this._robot.pos.distanceTo(World.Ball.pos) > 0.13) {
			debug.set("redeciding", "TRUE (rebound)");
			this._hadBallCounter = 0;
			return true;
		}

		// never redecide if the ball is being shot (but isShot did not trigger yet)
		if (Robot.hadBall(this._robot, 0.25)) {
			this._hadBallCounter = this._hadBallCounter + 1;
			debug.set("redeciding", "FALSE (hadBall)");
			return false;
		}

		// redecide if the ball is still accelerating due to the tracking
		if (Ball.isAccelerating()) {
			debug.set("redeciding", "TRUE (accelerating)");
			return true;
		}

		// redecide if passTiming changed a lot
		if (this._decision.task === "pass") {
			let oldTime = this._decision.time;
			let oldTarget = this._decision.target;
			let newSug = this._messaging.receive(MessageType.passSuggestion).get(oldTarget);
			if (newSug && newSug.time > oldTime + 0.2) {
				debug.set("redeciding", "TRUE(passTiming)");
				return true;
			}
		}

		// redecide if the attackPosition changed a lot
		if (this._attackPosition && this._prevAttackPosition
				&&  this._attackPosition.distanceTo(this._prevAttackPosition) > 0.3) {
			debug.set("redeciding", "TRUE (attackPosition)");
			return true;
		}

		// redecide if the last decision was the fallback one
		if (this._decision.quality === "fallback") {
			debug.set("redeciding", "TRUE (fallback)");
			return true;
		}

		if (!this._wasPressed && Robot.isPressed(this._robot)) {
			debug.set("redeciding", "TRUE (pressed)");
			return true;
		}

		// don't redecide if we are close to shoot a stationary ball
		if (World.Ball.speed.lengthSq() < 0.5 * 0.5 && World.Ball.pos.distanceToSq(this._robot.pos) < (0.2 + this._robot.radius) * (0.2 + this._robot.radius)) {
			debug.set("redeciding", "FALSE (stationary)");
			return false;
		}

		// redecide if after a certain time
		if (World.Time >= this._nextDecisionTime) {
			debug.set("redeciding", "TRUE (nextDecisionTime)");
			return true;
		}

		if (this._decision.pos != undefined && Ball.receivesPass(this._robot)) {
			let shootAngle = World.Ball.speed.absoluteAngleDiff(this._robot.pos - this._decision.pos);
			if (shootAngle > 75 * Math.PI / 180) {
				debug.set("redeciding", "TRUE (large angle)");
				return true;
			}
		}


		debug.set("redeciding", "FALSE (default)");
		return false;
	}

	_updateTask(): TaskAssignment<typeof Pass> | TaskAssignment<typeof ShootGoal> | TaskAssignment<typeof ChipToPos> {
		let pressed = Robot.isPressed(this._robot);
		let color = pressed ? vis.colors.redHalf : vis.colors.greenHalf;
		vis.addCircle("a/a/shoot: pressed", this._robot.pos, 0.3, color, true);


		let lastIncomingPassInfo = Attack.lastIncomingPassInfo(this._robot, this._messaging.receiveSingleSender(MessageType.passInfo));
		if (lastIncomingPassInfo) {
			this._lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos;
		}
		debug.set("last incoming passInfo", this._lastIncomingPassInfoPos);

		this._forceKeepingInPool = true;
		this._activeFrames = this._activeFrames + 1;

		// update attack position
		this._prevAttackPosition = this._attackPosition;
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition, true)[1];
		this._attackPosition = attackPosition;

		this._checkForManualAlly();

		// redecide if necessary
		let redeciding = this._redeciding();
		if (redeciding) {
			this._decision = this._decide();
			this._nextDecisionTime = World.Time + 1.5;
		}

		// visualize decision
		if ((this._decision as any).pos != undefined) {
			Attack.visualizeAttack(this._robot.pos, (this._decision as any).pos);
		}

		// write decision to debug tree
		debug.set("decision", this._decision.task);
		for (let [k, v] of Object.entries(this._decision)) {
			if (k !== "task") {
				let value = String(v);
				if (k === "time") {
					value = `${v - World.Time} (${value})`;
				}
				debug.set("decision/" + String(k), value);
			}
		}

		// return shoot goal if the decision says so
		if (this._decision.task === "shootgoal") {
			return [ShootGoal, [ this._lastIncomingPassInfoPos ]];
		}

		// time the pass
		if (this._decision.task === "pass") {
			let suggestedTime = this._decision.time;
			let target = this._decision.target;
			let ballPos = this._decision.pos;

			let chipOverride = undefined;
			let targetSpeed = undefined;
			if (target === this._robot) {
				chipOverride = true;
				targetSpeed = 0.1;
			}

			// update target if the decision changed
			// creating a new task instance would mess up catchBall
			if (this._task != undefined && this._task instanceof Pass
					&&  this._decision.pos !== this._prevPassPos) {
				this._task.updateTarget(this._decision.target, this._decision.pos, chipOverride, this._decision.time, targetSpeed);
			}
			this._prevPassPos = this._decision.pos;

			let attackTime = this._messaging.receiveSingleSender(MessageType.attackTime, true)[1];
			let shootTime = attackTime ? attackTime - World.Time : Robot.minShootTime(this._robot, ballPos);
			let shootPos = Physics.ballAtTime(World.Ball, shootTime).pos;
			let ballTravelTime = ObserverShoot.ballPassTime(shootPos, ballPos, target, undefined, this._robot);
			let passReceiveTime = Math.max(suggestedTime, shootTime + ballTravelTime + World.Time);

			// save time for future use:
			this._decision.time = passReceiveTime;

			this._messaging.sendBroadcast(MessageType.passInfo, [{ target: target,
				ballPos: ballPos, time: passReceiveTime }]);

			return [Pass, [ target, ballPos, chipOverride, this._lastIncomingPassInfoPos, this._decision.time, targetSpeed]];
		}

		if (this._decision.task === "chipToPos") {
			return [ChipToPos, [this._decision.pos, this._decision.time, this._attackPosition]];
		}

		// error: invalid decision
		throw new Error();
	}
}
