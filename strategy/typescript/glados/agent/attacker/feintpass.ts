import * as constants from "base/constants";
import * as debug from "base/debug";
import * as MathUtil from "base/mathutil";
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
import { checkPassInfos, PassInfo, currentPlannedMainAttacker } from "glados/util/attack";
import { addDummyVisualizations } from "glados/util/dummy";
import { isInZone, Zone } from "glados/util/zone";

const PASS_DISTANCE_HYSTERESIS = 0.2;
const PASS_DIST_SMALL_THRESHOLD = 3;
const PASS_DIST_LARGE_THRESHOLD = 5;
const IS_REACHABLE_TIMEDIFF = 0.5;

export class FeintPass extends Behavior {

	private lastFeintSamplings = new Map<PassInfo, number>();
	private supportParams: SupportParameters | undefined;

	private restartTask: boolean = false;
	private nextPassInfo: PassInfo | undefined;
	private nextSender: FriendlyRobot | undefined;
	private lastSender: FriendlyRobot | undefined;
	private nextFeintpos: Position | undefined;
	private nextAttackPosition: Position | undefined;
	private canDoPasses: boolean;

	public constructor(agent: Agent, supportParams?: SupportParameters) {
		super(agent);
		this.supportParams = supportParams;
		this.canDoPasses = supportParams !== undefined;
	}

	protected _stop() {
		this.lastFeintSamplings = new Map<PassInfo, number>();
		this.restartTask = false;
		this.nextPassInfo = undefined;
		this.nextSender = undefined;
		this.lastSender = undefined;
		this.nextFeintpos = undefined;
		this.nextAttackPosition = undefined;
	}

	private getFeintPosition(sender: FriendlyRobot | undefined, passInfoTable: ReadonlyRec<PassInfo[]>,
			attackPosition: Position, plannedAttackTime: number | undefined, zone: Zone): [PassInfo | undefined, Position | undefined] {
		let relevantPassInfoMessage = undefined;
		let bestTime = Infinity;
		let bestPosition = undefined;
		let feintSamplings = new Map<PassInfo, number>();

		// Reset lastFeintSamplings if the MA changed since the passes are guaranteed to be new
		if (sender !== this.lastSender) {
			this.lastFeintSamplings = new Map<PassInfo, number>();
		}

		for (let passInfo of passInfoTable) {

			let passPos = passInfo.ballPos;
			let passSpeed = passInfo.passSpeed;
			let passDist = passPos.distanceTo(attackPosition);
			debug.set("passDistance", passDist);

			// If there is a well-defined previous behaviour and we are close to one of the thresholds
			// Consider two passInfos to be the same if it came from the same MA (otherwise lastFeintSamplings will be empty)
			// and have the same target
			let passInfoLastFrame = Array.from(this.lastFeintSamplings.keys()).find((element) => element.target === passInfo.target);
			if (passInfoLastFrame !== undefined
				&& (Math.abs(passDist - PASS_DIST_SMALL_THRESHOLD) < PASS_DISTANCE_HYSTERESIS
				|| Math.abs(passDist - PASS_DIST_LARGE_THRESHOLD) < PASS_DISTANCE_HYSTERESIS)) {
				// Hysteresis says: continue what you were doing before
				feintSamplings[passInfo] = this.lastFeintSamplings[passInfoLastFrame];
			} else {
				// Just make hard cuts
				feintSamplings[passInfo] = MathUtil.bound(0, Math.floor((passDist - 1) / 2), 2);
			}

			let possibleFeintPositions = [];
			if (feintSamplings[passInfo] > 0) {
				possibleFeintPositions.push(0.5 * (attackPosition + passPos));
			}
			if (feintSamplings[passInfo] > 1) {
				possibleFeintPositions.push(attackPosition + 0.75 * (passPos - attackPosition));
			}
			if (feintSamplings[passInfo] > 2) {
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
		this.lastSender = sender;
		return [relevantPassInfoMessage, bestPosition];
	}

	public check(): Behavior | undefined {
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo);
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1] || World.Ball.pos;
		let plannedAttackTime = this._messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];

		// If we don't have a zone yet, do something else
		let zoneType = this.canDoPasses ? MessageType.supportZone : MessageType.dummyZone;
		let zone = this._messaging.receiveTrainer(zoneType);
		if (zone == undefined) {
			return undefined;
		}

		// Check if we currently plan a pass
		let passPlanned = passInfoTable !== undefined && attackPosition !== undefined && plannedAttackTime !== undefined;

		// Check if we needed to accept the next planned pass last frame
		let prevRobotTime = (this._task instanceof AcceptPass) ? this._task.getLastTime() : undefined;
		let [acceptingPass, _timeLeft] = passInfoTable ? checkPassInfos(this._robot, passInfoTable, false, prevRobotTime) : [false, undefined];
		let escapeToAccept = acceptingPass && this.nextAttackPosition !== undefined &&
		 this.nextPassInfo !== undefined && this.nextSender !== undefined && this.nextFeintpos !== undefined;

		debug.set("passPlanned", passPlanned);

		let doFeintPass = false;
		let lastFeintPassTarget = this._messaging.receiveTrainer(MessageType.feintPassTarget);
		let passCompleted = this._task instanceof FeintPassTask ? this._task.complete : false;

		// If we were doing a feint in the last frame and the pass is not already completed
		if (lastFeintPassTarget !== undefined && !escapeToAccept && !passCompleted) {

			debug.set("doingFeint", undefined);

			if (this._task instanceof FeintPassTask) {
				// Update wasPassShot and evacuate, if possible (otherwise the task will be newly constructed anyways)
				this._task.updateState(attackPosition);

				// Never abort during evacuation
				if (this._task.evacuate) {
					this.applyForMainAttacker(undefined, undefined, 0);
					this.restartTask = false;
					doFeintPass = true;

					let feintTarget = { passRobot: this._task.passRobot,
						passInfo: this._task.relevantPassInfo,
						feintPos: this._task.feintPos
					};

					this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
				}
			}

			// Get info on the pass that we are feinting
			let lastPassInfo = lastFeintPassTarget.passInfo;
			let lastPassRobot = lastFeintPassTarget.passRobot;

			// Check if the pass of the feint was already shot
			let wasPassShot = this._task instanceof FeintPassTask ? this._task.passWasShot : (
				passInfoTable !== undefined && ((currentPlannedMainAttacker(sender, passInfoTable) === lastPassInfo.target
				&& lastPassInfo.target !== undefined) || sender === lastPassRobot)
			);
			debug.set("wasPassShot", wasPassShot);

			// If we are planning a pass
			if (passPlanned) {
				let [passInfo, feintPos] = this.getFeintPosition(sender, passInfoTable!, attackPosition, plannedAttackTime, zone);

				debug.set("isReachable", passInfo != undefined);

				// If we can reach the planned pass in time
				if (passInfo !== undefined && feintPos !== undefined) {
					let samePass = lastPassInfo.target === passInfo.target && sender === lastPassRobot;
					// And it is the same pass that we already feint
					debug.set("samePass", samePass);
					if (samePass && !wasPassShot) {

						if (this._task instanceof FeintPassTask) {
							// Update info on this pass and continue
							this._task.updatePass(passInfo, feintPos, attackPosition);
							this.restartTask = false;
						} else {
							// Need to reconstruct the old FeintPassTask
							this.nextAttackPosition = attackPosition;
							this.nextFeintpos = feintPos;
							this.nextSender = lastFeintPassTarget.passRobot;
							// Use the new passInfo for most recent timing info
							this.nextPassInfo = passInfo;
							this.restartTask = true;
						}

						this.applyForMainAttacker(undefined, undefined, 0);

						doFeintPass = true;
						let feintTarget = { passRobot: lastPassRobot, passInfo: passInfo, feintPos: feintPos };
						this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
					} else {
						// If it is a new pass
						if (wasPassShot) {
							// But our pass was already shot ---> keep feinting the current pass
							this.applyForMainAttacker(undefined, undefined, 0);
							if (this._task instanceof FeintPassTask) {
								// Just reuse the current task if it still exists
								this.restartTask = false;
							} else {
								// Else reconstruct it
								this.nextAttackPosition = attackPosition;
								// Explicitly don't update the feintPos here, since the new one belongs to the new pass
								this.nextFeintpos = lastFeintPassTarget.feintPos;
								this.nextPassInfo = lastPassInfo;
								this.nextSender = lastPassRobot;
								this.restartTask = true;
							}

							doFeintPass = true;
							let feintTarget = { passRobot: lastPassRobot, passInfo: lastPassInfo, feintPos: lastFeintPassTarget.feintPos };
							this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
						} else {
							// Our pass wasn't shot yet ---> it is probably dead. Feint the new pass
							this.applyForMainAttacker(undefined, undefined, 0);
							this.restartTask = true;
							this.nextAttackPosition = attackPosition;
							this.nextFeintpos = feintPos;
							this.nextSender = sender;
							this.nextPassInfo = passInfo;

							doFeintPass = true;
							let feintTarget = { passRobot: sender!, passInfo: passInfo, feintPos: feintPos };
							this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
						}
					}
				// If we can't reach the new pass, but the old one already was shot and we can reach it
				} else if (wasPassShot && this.checkIsOldPassUnreachable(lastFeintPassTarget.feintPos)) {
					// Continue feinting the old pass
					this.applyForMainAttacker(undefined, undefined, 0);
					if (this._task instanceof FeintPassTask) {
						// Reuse the old task if possible
						this.restartTask = false;
					} else {
						// Else reconstruct the old pass
						this.restartTask = true;
						this.nextAttackPosition = attackPosition;
						this.nextFeintpos = lastFeintPassTarget.feintPos;
						this.nextPassInfo = lastPassInfo;
						this.nextSender = lastPassRobot;
					}

					doFeintPass = true;
					let feintTarget = { passRobot: lastPassRobot, passInfo: lastPassInfo, feintPos: lastFeintPassTarget.feintPos };
					this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
				}
				// We can't reach the new one and the old pass is either dead or unreachable ---> do something else
			// We aren't planning a pass, but our old pass was already shot and we can reach it
			} else if (wasPassShot && this.checkIsOldPassUnreachable(lastFeintPassTarget.feintPos)) {
				// Continue feinting the old pass
				this.applyForMainAttacker(undefined, undefined, 0);

				if (this._task instanceof FeintPassTask) {
					// Reuse the old task if possible
					this.restartTask = false;
				} else {
					// Else reconstruct the old pass
					this.restartTask = true;
					this.nextAttackPosition = attackPosition;
					this.nextFeintpos = lastFeintPassTarget.feintPos;
					this.nextPassInfo = lastPassInfo;
					this.nextSender = lastPassRobot;
				}

				doFeintPass = true;
				let feintTarget = { passRobot: lastPassRobot, passInfo: lastPassInfo, feintPos: lastFeintPassTarget.feintPos };
				this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
			}
			// We aren't planning a new pass and the old one is dead ---> do something else
		// If we need to escape the passline now in order to reach our next pass
		} else if (escapeToAccept) {
			// Use the extra obstacle to escape the passline asap but also get to the passDest
			// That means we need to stay in this behavior until the passline is evacuated again

			// This is very hacky
			if (this._robot.pos.orthogonalDistance(this.nextAttackPosition!, this.nextPassInfo!.ballPos) < this._robot.radius + World.Ball.radius + 0.1) {
				this._robot.path.addLine(World.Ball.pos, this.nextPassInfo!.ballPos, this._robot.radius, "PassEvacuation", 1);

				doFeintPass = true;
				let feintTarget = { passRobot: this.nextSender!, passInfo: this.nextPassInfo!, feintPos: this.nextFeintpos! };
				this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
			}

		// We aren't already doing a feint but a pass is being planned
		} else if (passPlanned) {
			let [passInfo, feintPos] = this.getFeintPosition(sender, passInfoTable!, attackPosition, plannedAttackTime!, zone);
			debug.set("newPassReachable", passInfo !== undefined);
			// if the new pass is reachable and is not ours to accept
			if (passInfo !== undefined && feintPos !== undefined && passInfo.target !== this._robot) {
				// Feint the pass
				this.applyForMainAttacker(undefined, undefined, 0);
				this.restartTask = true;
				this.nextAttackPosition = attackPosition;
				this.nextFeintpos = feintPos;
				this.nextSender = sender;
				this.nextPassInfo = passInfo;

				doFeintPass = true;
				let feintTarget = { passRobot: sender!, passInfo: passInfo, feintPos: feintPos };
				this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
			}
		}

		if (doFeintPass && this._messaging.receiveTrainer(MessageType.feintPassTarget)) {
			return this;
		}

		return undefined;
	}

	protected _updateTask(): TaskAssignment<typeof FeintPassTask> | TaskAssignment<typeof AcceptPass> | typeof CONTINUE_TASK {
		addDummyVisualizations(this._robot);
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let prevRobotTime = (this._task instanceof AcceptPass) ? this._task.getLastTime() : undefined;
		let [acceptingPass, _timeLeft] = passInfoTable ? checkPassInfos(this._robot, passInfoTable, false, prevRobotTime) : [false, undefined];

		if (acceptingPass) {
			if (!this.canDoPasses) {
				amun.log("Dummy can't accept Pass, this is a Bug!");
			}
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
		let dummyEvacuatePos = feintPos + (feintPos - this._robot.pos).withLength(2 * this._robot.radius);
		let robotTime = Math.min(
			Physics.robotTimeToPos(this._robot, feintPos, new Vector(0, 0))[0],
			Physics.robotTimeToPos(this._robot, dummyEvacuatePos, (dummyEvacuatePos - this._robot.pos).withLength(this._robot.speed.length()))[0]
		);

		let isOldPassReachable = robotTime < ballTime;
		debug.set("isOldPassReachable", isOldPassReachable);
		debug.set("feintPos", feintPos);
		debug.set("ballTime", ballTime);
		debug.set("robotTime", robotTime);
		return isOldPassReachable;
	}
}
