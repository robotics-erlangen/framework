import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as BaseRef from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { formatTimestamp, MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as ObserverShoot from "glados/observer/shoot";
import { ShootGoal } from "glados/task/attacker/shootgoal";
import { StopAttack } from "glados/task/attacker/stopattack";
import { ChipToPos } from "glados/task/shared/chiptopos";
import { DefenseChip } from "glados/task/shared/defensechip";
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
	pos?: undefined;
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
} | {
	task: "chipAwayFromDefenseArea";
	pos: Position;
	quality: "clean";
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
	private _prevTime: number = 0;
	private _passFrames: number = 0;
	private _decisionFrames: number = 0;
	private _ratePass: Attack.PassRater;

	private readonly _problematicDistance = 0.20 + this._robot.radius + World.Ball.radius;

	/**
	 * Create a new Shoot instance parameterized with a pass rating function.
	 *
	 * @param agent - The agent this behavior will initially belong to
	 * @param ratePass - The function to rate passes with
	 */
	public constructor(agent: Agent, ratePass: Attack.PassRater) {
		super(agent);
		this._ratePass = ratePass;
	}

	protected _stop() {
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
		this._passFrames = 0;
		this._decisionFrames = 0;
	}

	public check(): Behavior | undefined {
		return this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot
			? this
			: undefined;
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
		this._passFrames = 0;
		this._decisionFrames = 0;
		this._wasPressed = Robot.isPressed(this._robot);
		let do_pseudopass = false;

		if (Math.abs(this._robot.pos.x) < G.DefenseWidth + 1
				&& this._robot.pos.y < -(G.FieldHeightHalf - G.DefenseHeight - 1)) {

			const obscured = this.isChipObscured();

			const isGame = World.RefereeState === "Game" || World.RefereeState === "GameForce";
			if (isGame
					&& !obscured
					&& Vector.fromAngle(this._robot.dir).absoluteAngleDiff(this._robot.pos - G.FriendlyGoal) < geom.degreeToRadian(90)
					&& (Robot.hadBall(this._robot, 0) || (Robot.hadBall(this._robot, 0.1) && Robot.isPressed(this._robot, this._attackPosition)))) {
				return {
					task: "chipAwayFromDefenseArea",
					pos: this._robot.pos + Vector.fromAngle(this._robot.dir) * 2,
					quality: "clean",
				};
			}
		}

		// perform clean goal shots if possible
		if (ShootGoalUtil.shootGoalPossible(this._robot, this._attackPosition)[0]) {
			return {
				task: "shootgoal",
				pos: World.Geometry.OpponentGoal,
				quality: "clean"
			};
		}

		const earliestAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1];

		// if the MA is the only attacker it does not make sense to accept pass suggestions, because only defenders can suggest passes in this situation
		// and if attackRatio sent onlySingleAttacker those defenders are not allowed to switch to the attacker role,
		// which would be necessary for them to accept the pass -> we can't pass
		const limitedAttackerCount = this._messaging.receiveTrainer(MessageType.limitedAttackerCount);
		let passSuggestions = (limitedAttackerCount != undefined && limitedAttackerCount <= 1) ? new Map() : this._messaging.receive(MessageType.passSuggestion);

		let pass = Attack.choosePassFromSuggestions(this._robot, passSuggestions, {
			earliestAttackTime,
			attackPosition: this._attackPosition,
			currentPassPos: this._prevPassPos,
			considerTiming: true,
			ratePass: this._ratePass,
		})[0];

		// consider chipping forward
		let passRating = pass ? this._ratePass(this._robot, pass, earliestAttackTime, this._attackPosition, true) : 0;
		if (ENABLE_PSEUDO_PASS && this._attackPosition && passRating < MIN_PASS_RATING
				&& Field.distanceToDefenseAreaSq(this._attackPosition, false) > 2
				&& World.Ball.speed.length() < 1
				&& Math.abs(this._attackPosition.y) < 5 / 6 * G.FieldWidthHalf) {

			const MIN_DISTANCE = 0.1;
			const MAX_DISTANCE = 0.5;
			const DISTANCE_STEP = 0.1;

			const CONE_WIDTH = geom.degreeToRadian(90);
			const ANGLE_STEP = geom.degreeToRadian(15);

			const OPPONENT_DISTANCE_THRESHOLD = 1;

			// look for close opponents
			let closestOppDist = Infinity;
			for (let opp of World.OpponentRobots) {
				let toGoal = (G.OpponentGoal - this._attackPosition).withLength((MAX_DISTANCE - MIN_DISTANCE) / 2 + MIN_DISTANCE);
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
				let currentPass = pass;
				for (let dist = MIN_DISTANCE; dist <= MAX_DISTANCE; dist += DISTANCE_STEP) {
					for (let angle = -CONE_WIDTH / 2; angle <= CONE_WIDTH / 2; angle += ANGLE_STEP) {
						// check for possible goalshot opportunity
						let newAttackPosition = this._attackPosition + Vector.fromPolar(attackAngle + angle, dist);
						let [possible, freeAngle] = ShootGoalUtil.shootGoalPossible(this._robot, newAttackPosition);
						if (possible && freeAngle != undefined && freeAngle > bestFreeAngle) {
							bestFreeAngle = freeAngle;
							bestAttackPosition = newAttackPosition;
						}
						// look for better pass opportunities
						let newPass = Attack.choosePassFromSuggestions(this._robot, passSuggestions, {
							earliestAttackTime,
							attackPosition: newAttackPosition,
							currentPassPos: currentPass ? currentPass!.ballPos : this._prevPassPos,
							considerTiming: false,
							ratePass: this._ratePass,
						})[0];
						let newPassRating = newPass ? this._ratePass(this._robot, newPass, earliestAttackTime, newAttackPosition, false) : 0;
						if (newPassRating > bestRating && newPassRating > MIN_PASS_RATING) {
							bestRating = newPassRating;
							pass = { target: this._robot, ballPos: newAttackPosition, time: World.Time };
							do_pseudopass = true;
						}
					}
				}

				// goalshot opportunity
				if (bestAttackPosition != undefined) {
					let passVector = (bestAttackPosition - this._attackPosition).withLength(0.5);
					if (Attack.isPassAllowed(this._attackPosition, this._attackPosition + passVector)) {
						return {
							task: "pass",
							target: this._robot,
							pos: this._attackPosition + passVector,
							time: World.Time,
							quality: "clean"
						};
					}
				}

				// short chip forward
				let relevantRating = 0;
				if (pass) {
					relevantRating = do_pseudopass ? bestRating : this._ratePass(this._robot, pass, earliestAttackTime, this._attackPosition, true);
				}
				if (pass == undefined || relevantRating < MIN_PASS_RATING) {
					let newAttackPosition = this._attackPosition + Vector.fromPolar(attackAngle, (MAX_DISTANCE - MIN_DISTANCE) / 2 + MIN_DISTANCE);
					let passVector = (newAttackPosition - this._attackPosition).withLength(0.5);
					if (Attack.isPassAllowed(this._attackPosition, this._attackPosition + passVector)) {
						return {
							task: "pass",
							target: this._robot,
							pos: this._attackPosition + passVector,
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

	private isChipObscured(): boolean {
		return undefined !== World.OpponentRobots.find((opponent) => {
			const intersection = geom.intersectLineCircle(this._robot.pos, Vector.fromAngle(this._robot.dir), opponent.pos, opponent.radius + this._robot.radius);

			if (intersection.length !== 4) {
				return false;
			}

			return intersection[2] < this._problematicDistance
				|| (intersection[3] !== undefined && intersection[3] < this._problematicDistance);
		});
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

		let suffixDebugString = "";
		let redecidePassTiming = false;
		let redecideNoLongerOffered = false;
		// adopt earlier time if pass timing reduced
		if (this._decision.task === "pass") {
			let oldTime = this._decision.time;
			let oldTarget = this._decision.target;
			let newSug = this._messaging.receive(MessageType.passSuggestion).get(oldTarget);
			// redecide later if pass timing increased
			// make decision here so that newSug won't be determined again later
			// but we want (imminent) and (hadball) to maintain higher priority
			if (newSug && newSug.time > oldTime + 0.2 && this._passFrames > 2) {
				redecidePassTiming = true;
			}
			if (newSug && newSug.time < oldTime - 0.1 && this._passFrames > 2) {
				suffixDebugString = ` + (earlyPassTiming (${newSug.time - oldTime}))`;
				this._decision.time = newSug.time;
				this._passFrames = 0;
			}
			// redecide later if pass no longer offered
			// (imminent) and (hadball) should have higher priority
			if (!newSug && this._passFrames > 2) {
				redecideNoLongerOffered = true;
			}
		}

		// redecide if during a pseudo pass, the ball overtakes the pass pos
		// this is moderately likely to happen during chaseBall
		if (!Robot.isPressed(this._robot) && ENABLE_PSEUDO_PASS && this._decision.task === "pass" && this._decision.target === this._robot) {
			let passVector = this._decision.pos - World.Ball.pos;
			let ballSpeed = World.Ball.speed;

			let absAngleDiff = ballSpeed.absoluteAngleDiff(passVector);

			if (ballSpeed.lengthSq() > 0.3 * 0.3 && passVector.lengthSq() > 0.05 * 0.05 && absAngleDiff > Math.PI / 2 && Ball.wasShot(0.2)) {
				debug.set("redeciding", "TRUE (passPos overtaken)");
				return true;
			}
		}

		// never redecide if the ball is imminent
		let dribblerPos = this._robot.pos + (World.Ball.pos - this._robot.pos).withLength(
			World.Ball.radius + this._robot.shootRadius);
		let ballTimeToDribbler = Physics.checkedBallRollTime(World.Ball, dribblerPos);

		if (ballTimeToDribbler < 0.5 && !(ballTimeToDribbler < 0 &&
			World.Ball.pos.distanceToSq(dribblerPos) > 4 * World.Ball.radius * World.Ball.radius)) {
			debug.set("redeciding", "FALSE (imminent)");
			return false;
		}

		if (this._decision.task === "chipAwayFromDefenseArea") {
			if (Math.abs(this._robot.pos.x) > G.DefenseWidth + 1.1
					&& this._robot.pos.y > -(G.FieldHeightHalf - G.DefenseHeight - 1.1)) {

				return true;
			}

			const obscured = this.isChipObscured();

			const isGame = World.RefereeState === "Game" || World.RefereeState === "GameForce";
			if (!isGame
					|| obscured
					|| Vector.fromAngle(this._robot.dir).absoluteAngleDiff(this._robot.pos - G.FriendlyGoal) > geom.degreeToRadian(100)
					|| !Robot.hadBall(this._robot, 0.1)) {
				debug.set("redeciding", "TRUE (stop chipAway)");
				return true;
			}
		} else if (Math.abs(this._robot.pos.x) < G.DefenseWidth + 0.9
				&& this._robot.pos.y < -(G.FieldHeightHalf - G.DefenseHeight - 0.9)
				&& !this.isChipObscured()
				&& Vector.fromAngle(this._robot.dir).absoluteAngleDiff(this._robot.pos - G.FriendlyGoal) < geom.degreeToRadian(80)
				&& Robot.controlsBall(this._robot, 0.1)) {

			debug.set("redeciding", "TRUE (consider chipAway)");
			return true;
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
		if (redecidePassTiming) {
			debug.set("redeciding", "TRUE (passTiming)");
			return true;
		}

		// redecide if the passReciever no longer offers that pass
		if (redecideNoLongerOffered) {
			debug.set("redeciding", `TRUE (dropped suggestion)${suffixDebugString}`);
		}

		// redecide if the attackPosition changed a lot
		// don't if it is the first or second frame after a suggestion, as this is a valid situation for CB to change the attack Position a lot
		// two frames are necessary since prevAttackPosition is the attackposition from two frames ago, so the old executed task
		if (this._attackPosition && this._prevAttackPosition
				&& this._attackPosition.distanceTo(this._prevAttackPosition) > 0.3 && this._decisionFrames > 2) {
			debug.set("redeciding", `TRUE (attackPosition)${suffixDebugString}`);
			return true;
		}

		// redecide if the last decision was the fallback one
		if (this._decision.quality === "fallback") {
			debug.set("redeciding", `TRUE (fallback)${suffixDebugString}`);
			return true;
		}

		if (!this._wasPressed && Robot.isPressed(this._robot)) {
			debug.set("redeciding", `TRUE (pressed)${suffixDebugString}`);
			return true;
		}

		// don't redecide if we are close to shoot a stationary ball
		if (World.Ball.speed.lengthSq() < 0.5 * 0.5 && World.Ball.pos.distanceToSq(this._robot.pos) < (0.2 + this._robot.radius) * (0.2 + this._robot.radius)) {
			debug.set("redeciding", `FALSE (stationary)${suffixDebugString}`);
			return false;
		}

		// redecide if after a certain time
		if (World.Time >= this._nextDecisionTime) {
			debug.set("redeciding", `TRUE (nextDecisionTime)${suffixDebugString}`);
			return true;
		}

		if (this._decision.pos != undefined && Ball.receivesPass(this._robot)) {
			let shootAngle = World.Ball.speed.absoluteAngleDiff(this._robot.pos - this._decision.pos);
			if (shootAngle > geom.degreeToRadian(75)) {
				debug.set("redeciding", `TRUE (large angle)${suffixDebugString}`);
				return true;
			}
		}


		debug.set("redeciding", `FALSE (default)${suffixDebugString}`);
		return false;
	}

	protected _updateTask(): TaskAssignment<typeof Pass> | TaskAssignment<typeof ShootGoal> | TaskAssignment<typeof ChipToPos> | TaskAssignment<typeof StopAttack> | TaskAssignment<typeof DefenseChip> {
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
		this._decisionFrames++;

		// visualize decision
		if (this._decision.pos !== undefined) {
			Attack.visualizeAttack(this._robot.pos, this._decision.pos);
		}

		// write decision to debug tree
		debug.set("decision", this._decision.task);
		for (let [k, v] of Object.entries(this._decision)) {
			if (k !== "task") {
				if (k === "time") {
					v = formatTimestamp(v);
				}
				debug.set(`decision/${k}`, v);
			}
		}

		// return shoot goal if the decision says so
		if (this._decision.task === "shootgoal") {
			return [ShootGoal, [this._lastIncomingPassInfoPos]];
		}

		// time the pass
		if (this._decision.task === "pass") {
			this._passFrames++;
			let suggestedTime = this._decision.time;
			let target = this._decision.target;
			let ballPos = this._decision.pos;

			let chipOverride = undefined;
			let targetSpeed = undefined;
			if (target === this._robot) {
				chipOverride = true;
				targetSpeed = 0.1;
			}


			let [sender, attackTime] = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true);

			let shootTime = (this._robot === sender && attackTime != undefined) ? attackTime - World.Time : Robot.minShootTime(this._robot, ballPos);

			// don't start a new pass when unable to reach ball in time
			// ongoing passes have attackTime
			if (shootTime === Infinity) {
				return [StopAttack];
			}

			let shootPos = Physics.ballAtTime(World.Ball, shootTime).pos;
			let ballTravelTime = ObserverShoot.ballPassTime(shootPos, ballPos, target, undefined, this._robot);
			let passReceiveTime = Math.max(suggestedTime, shootTime + ballTravelTime + World.Time);

			// save time for future use:
			this._decision.time = passReceiveTime;

			// update target if the decision changed
			// creating a new task instance would mess up catchBall
			if (this._task != undefined && this._task instanceof Pass
			&& (this._decision.pos !== this._prevPassPos || Math.abs(this._decision.time - this._prevTime) > 0.1)) {
				this._task.updateTarget(this._decision.target, this._decision.pos, chipOverride, this._decision.time, targetSpeed);
				this._prevTime = this._decision.time;
			}
			this._prevPassPos = this._decision.pos;

			this._messaging.sendBroadcast(MessageType.passInfo, [{ target: target,
				ballPos: ballPos, time: passReceiveTime, passSpeed: targetSpeed !== undefined ? targetSpeed : this._robot.constants.passSpeed }]);

			let ballReceiptPos = Ball.friendlyBallOwnerTime() > Ball.opponentBallOwnerTime() ? this._lastIncomingPassInfoPos : undefined;

			return [
				Pass, [{
					targetRobot: target,
					targetPos: ballPos,
					chip: chipOverride,
					ballReceiptPos: ballReceiptPos,
					targetTime: this._decision.time,
					targetSpeed,
				}],
			];
		}

		if (this._decision.task === "chipToPos") {
			return [ChipToPos, [this._decision.pos, this._decision.time, this._attackPosition]];
		}

		if (this._decision.task === "chipAwayFromDefenseArea") {
			return [DefenseChip];
		}

		// error: invalid decision
		throw new Error();
	}

	public addDebugInfo() {
		debug.set(undefined, this.constructor.name);
		debug.set("ratePass", this._ratePass.name);
	}
}
