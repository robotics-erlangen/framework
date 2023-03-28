import * as constants from "base/constants";
import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Behavior, CONTINUE_TASK, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { FeintPassTask } from "glados/task/attacker/feintpass";
import { SupportParameters } from "glados/task/attacker/support";
import { checkPassInfos, PassInfo } from "glados/util/attack";
import { isInZone, Zone } from "glados/util/zone";

const PASS_DISTANCE_HYSTERESIS = 0.2;
const PASS_DIST_SMALL_THRESHOLD = 3;
const PASS_DIST_LARGE_THRESHOLD = 5;
const IS_REACHABLE_TIMEDIFF = 0.5;

export class FeintPass extends Behavior {

	private lastFeintSamplings = new Map<PassInfo, number>();
	private supportParams: SupportParameters;

	private restartTask: boolean = false;
	private nextPassInfo: PassInfo | undefined;
	private nextSender: FriendlyRobot | undefined;
	private nextFeintpos: Position | undefined;
	private nextAttackPosition: Position | undefined;

	constructor(agent: Agent, supportParams: SupportParameters) {
		super(agent);
		this.supportParams = supportParams;
	}

	_stop() {
		this.lastFeintSamplings = new Map<PassInfo, number>();
		this.restartTask = false;
		this.nextPassInfo = undefined;
		this.nextSender = undefined;
		this.nextFeintpos = undefined;
		this.nextAttackPosition = undefined;
	}

	private getFeintPosition(passInfoTable: ReadonlyRec<PassInfo[]>, attackPosition: Position, plannedAttackTime: number | undefined, zone: Zone):
	[PassInfo | undefined, Position | undefined] {
		let relevantPassInfoMessage = undefined;
		let bestTime = Infinity;
		let bestPosition = undefined;
		let feintSamplings = new Map<PassInfo, number>();

		for (let passInfo of passInfoTable) {

			let passPos = passInfo.ballPos;
			let passSpeed = passInfo.passSpeed;
			let passDist = passPos.distanceTo(attackPosition);
			let hysteresis = this.lastFeintSamplings.has(passInfo) ? PASS_DISTANCE_HYSTERESIS : 0;

			let possibleFeintPositions = [];
			debug.set("passDistance", passDist);
			if (passDist <= PASS_DIST_SMALL_THRESHOLD - hysteresis) {
				feintSamplings[passInfo] = 0;
				continue;
			} else if (passDist > PASS_DIST_SMALL_THRESHOLD + hysteresis && passDist <= PASS_DIST_LARGE_THRESHOLD - hysteresis) {
				feintSamplings[passInfo] = 1;
			} else if (passDist > PASS_DIST_LARGE_THRESHOLD + hysteresis) {
				feintSamplings[passInfo] = 2;
			} else {
				feintSamplings[passInfo] = this.lastFeintSamplings[passInfo]!;
			}

			if (feintSamplings[passInfo]! > 0) {
				possibleFeintPositions.push(0.5 * (attackPosition + passPos));
			}
			if (feintSamplings[passInfo]! > 1) {
				possibleFeintPositions.push(attackPosition + 0.75 * (passPos - attackPosition));
			}
			if (feintSamplings[passInfo]! > 2) {
				throw new Error("Currently only up to two feint positions per pass are supported");
			}

			debug.set("possibleFeintPositions", possibleFeintPositions.length);

			for (let feintPos of possibleFeintPositions) {

				// Check if possibly inside zone
				if (!isInZone(feintPos, zone)) {
					continue;
				}

				// Check if we can reach feintPos in time
				if (plannedAttackTime == undefined) {
					plannedAttackTime = World.Time;
				}

				let ballTime;
				if (this._task instanceof FeintPassTask && this._task.passWasShot) {
					ballTime = Physics.ballRollTime(World.Ball, World.Ball.pos.distanceTo(feintPos));
				} else {
					let ball = { pos: attackPosition, speed: (passPos - attackPosition).withLength(passSpeed), maxSpeed: constants.maxBallSpeed };
					ballTime = (plannedAttackTime - World.Time) + Physics.ballRollTime(ball, (feintPos - attackPosition).length());
				}

				let robotTime = Physics.robotTimeToPos(this._robot, feintPos, new Vector(0, 0))[0];

				let isReachableTimediff;
				if (this._task instanceof FeintPassTask && !this._task.complete) {
					isReachableTimediff = 0;
				} else {
					isReachableTimediff = IS_REACHABLE_TIMEDIFF;
				}

				if (robotTime <= bestTime && robotTime + isReachableTimediff < ballTime) {
					relevantPassInfoMessage = passInfo;
					bestTime = robotTime;
					bestPosition = feintPos;
					debug.set("robotTimeToFeintPos", robotTime);
					debug.set("ballTimeToFeintPos", ballTime);
				}

			}
		}
		this.lastFeintSamplings = feintSamplings;
		return [relevantPassInfoMessage, bestPosition];
	}

	check(): Behavior | undefined {
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo);
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1] || World.Ball.pos;
		let plannedAttackTime = this._messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];

		// If we don't have a zone yet, do something else
		let zone = this._messaging.receiveTrainer(MessageType.supportZone);
		if (zone == undefined) {
			return undefined;
		}

		// Check if we currently plan a pass
		let passPlanned = passInfoTable !== undefined && attackPosition !== undefined && plannedAttackTime !== undefined;

		// Check if we needed to accept the next planned pass last frame
		let prevRobotTime = (this._task instanceof AcceptPass) ? this._task.getLastTime() : undefined;
		let [acceptingPass, _timeLeft] = passInfoTable ? checkPassInfos(this._robot, passInfoTable, false, prevRobotTime) : [false, undefined];
		let escapeToAccept = acceptingPass && this.nextAttackPosition && this.nextPassInfo;

		debug.set("passPlanned", passPlanned);

		// If we are doing a feint in the last frame
		if (this._task instanceof FeintPassTask && !this._task.complete) {
			debug.set("doingFeint", undefined);

			// Update wasPassShot and evacuate
			this._task.updateState(attackPosition);

			// Never abort during evacuation
			if (this._task.evacuate) {
				this._applyForMainAttacker(undefined, undefined, 0);
				this.restartTask = false;
				return this;
			}

			// Check if the pass of the feint was already shot
			let wasPassShot = this._task.passWasShot;
			debug.set("wasPassShot", wasPassShot);

			// Get info on the pass that we are feinting
			let lastPassInfo = this._task.relevantPassInfo;
			let lastPassRobot = this._task.passRobot;

			// If we are planning a pass
			if (passPlanned) {
				let [passInfo, feintPos] = this.getFeintPosition(passInfoTable!, attackPosition, plannedAttackTime, zone);

				debug.set("isReachable", passInfo != undefined);

				// If we can reach the planned pass in time
				if (passInfo !== undefined && feintPos !== undefined) {
					let samePass = lastPassInfo.target === passInfo.target && sender === lastPassRobot;
					// And it is the same pass that we already feint
					debug.set("samePass", samePass);
					if (samePass && !wasPassShot) {
						// Update info on this pass and continue
						this._task.updatePass(passInfo, feintPos, attackPosition);
						this._applyForMainAttacker(undefined, undefined, 0);
						this.restartTask = false;
						return this;
					} else {
						// If it is a new pass
						if (wasPassShot) {
							// But our pass was already shot ---> keep feinting the current pass
							this._applyForMainAttacker(undefined, undefined, 0);
							this.restartTask = false;
							return this;
						} else {
							// Our pass wasn't shot yet ---> it is probably dead. Feint the new pass
							this._applyForMainAttacker(undefined, undefined, 0);
							this.restartTask = true;
							this.nextAttackPosition = attackPosition;
							this.nextFeintpos = feintPos;
							this.nextSender = sender;
							this.nextPassInfo = passInfo;
							return this;
						}
					}
				// If we can't reach the new pass, but the old one already was shot and we can reach it
				} else if (wasPassShot && this.checkIsOldPassUnreachable(this._task.feintPos)) {
					// Continue feinting the old pass
					this._applyForMainAttacker(undefined, undefined, 0);
					this.restartTask = false;
					return this;
				}
				// We can't reach the new one and the old pass is either dead or unreachable ---> do something else
			// We aren't planning a pass, but our old pass was already shot and we can reach it
			} else if (wasPassShot && this._task.feintPos !== undefined && this.checkIsOldPassUnreachable(this._task.feintPos)) {
				// Continue feinting the old pass
				this._applyForMainAttacker(undefined, undefined, 0);
				this.restartTask = false;
				return this;
			}
			// We aren't planning a new pass and the old one is dead ---> do something else
		// If we need to escape the passline now in order to reach our next pass
		} else if (escapeToAccept) {
			// Use the extra obstacle to escape the passline asap but also get to the passDest
			// That means we need to stay in this behavior until the passline is evacuated again

			// This is very hacky
			if (this._robot.pos.orthogonalDistance(this.nextAttackPosition!, this.nextPassInfo!.ballPos) < this._robot.radius + World.Ball.radius + 0.1) {
				this._robot.path.addLine(World.Ball.pos.x, World.Ball.pos.y, this.nextPassInfo!.ballPos.x, this.nextPassInfo!.ballPos.y, this._robot.radius, "PassEvacuation", 1);
				return this;
			}

		// We aren't already doing a feint but a pass is being planned
		} else if (passPlanned) {
			let [passInfo, feintPos] = this.getFeintPosition(passInfoTable!, attackPosition, plannedAttackTime!, zone);
			debug.set("newPassReachable", passInfo !== undefined);
			// if the new pass is reachable
			if (passInfo !== undefined && feintPos !== undefined) {
				// Feint the pass
				this._applyForMainAttacker(undefined, undefined, 0);
				this.restartTask = true;
				this.nextAttackPosition = attackPosition;
				this.nextFeintpos = feintPos;
				this.nextSender = sender;
				this.nextPassInfo = passInfo;
				return this;
			}
		}
		return undefined;
	}

	_updateTask(): TaskAssignment<typeof FeintPassTask> | TaskAssignment<typeof AcceptPass> | typeof CONTINUE_TASK {
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let prevRobotTime = (this._task instanceof AcceptPass) ? this._task.getLastTime() : undefined;
		let [acceptingPass, _timeLeft] = passInfoTable ? checkPassInfos(this._robot, passInfoTable, false, prevRobotTime) : [false, undefined];

		if (acceptingPass) {
			return [AcceptPass];
		}

		if (this.restartTask) {
			this.restartTask = false;
			return [FeintPassTask, [this.supportParams, this.nextPassInfo!, this.nextSender!, this.nextFeintpos!, this.nextAttackPosition!], true];
		} else {
			return CONTINUE_TASK;
		}
	}

	// needs feintPos as parameter since this._task.feintPos can be undefined, so this way the method can only be called in situations where
	// feintPos is guaranteed to be defined
	private checkIsOldPassUnreachable(feintPos: Position): boolean {
		let ballTime = Physics.ballRollTime(World.Ball, World.Ball.pos.distanceTo(feintPos));
		let robotTime = Physics.robotTimeToPos(this._robot, feintPos, new Vector(0, 0))[0];

		let isOldPassReachable = robotTime < ballTime;
		debug.set("isOldPassReachable", isOldPassReachable);
		debug.set("feintPos", feintPos);
		debug.set("ballTime", ballTime);
		debug.set("robotTime", robotTime);
		return isOldPassReachable;
	}
}
