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

	private _lastFeintSamplings = new Map<PassInfo, number>();
	private _supportParams: SupportParameters | undefined;

	private _restartTask: boolean = false;
	private _nextPassInfo: PassInfo | undefined;
	private _nextSender: FriendlyRobot | undefined;
	private _lastSender: FriendlyRobot | undefined;
	private _nextFeintpos: Position | undefined;
	private _nextAttackPosition: Position | undefined;
	private _canDoPasses: boolean;

	public constructor(agent: Agent, supportParams?: SupportParameters) {
		super(agent);
		this._supportParams = supportParams;
		this._canDoPasses = supportParams !== undefined;
	}

	protected _stop() {
		this._lastFeintSamplings = new Map<PassInfo, number>();
		this._restartTask = false;
		this._nextPassInfo = undefined;
		this._nextSender = undefined;
		this._lastSender = undefined;
		this._nextFeintpos = undefined;
		this._nextAttackPosition = undefined;
	}

	private _getFeintPosition(sender: FriendlyRobot | undefined, passInfoTable: ReadonlyRec<PassInfo[]>,
			attackPosition: Position, plannedAttackTime: number | undefined, zone: Zone): [PassInfo | undefined, Position | undefined] {
		let relevantPassInfoMessage = undefined;
		let bestTime = Infinity;
		let bestPosition = undefined;
		let feintSamplings = new Map<PassInfo, number>();

		// Reset lastFeintSamplings if the MA changed since the passes are guaranteed to be new
		if (sender !== this._lastSender) {
			this._lastFeintSamplings = new Map<PassInfo, number>();
		}

		for (let passInfo of passInfoTable) {

			let passPos = passInfo.ballPos;
			let passSpeed = passInfo.passSpeed;
			let passDist = passPos.distanceTo(attackPosition);
			debug.set("passDistance", passDist);

			// If there is a well-defined previous behaviour and we are close to one of the thresholds
			// Consider two passInfos to be the same if it came from the same MA (otherwise lastFeintSamplings will be empty)
			// and have the same target
			let passInfoLastFrame = Array.from(this._lastFeintSamplings.keys()).find((element) => element.target === passInfo.target);
			if (passInfoLastFrame !== undefined
				&& (Math.abs(passDist - PASS_DIST_SMALL_THRESHOLD) < PASS_DISTANCE_HYSTERESIS
				|| Math.abs(passDist - PASS_DIST_LARGE_THRESHOLD) < PASS_DISTANCE_HYSTERESIS)) {
				// Hysteresis says: continue what you were doing before
				feintSamplings[passInfo] = this._lastFeintSamplings[passInfoLastFrame];
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
		this._lastFeintSamplings = feintSamplings;
		this._lastSender = sender;
		return [relevantPassInfoMessage, bestPosition];
	}

	public check(): Behavior | undefined {
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo);
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1] || World.Ball.pos;
		let plannedAttackTime = this._messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];

		// If we don't have a zone yet, do something else
		let zoneType = this._canDoPasses ? MessageType.supportZone : MessageType.dummyZone;
		let zone = this._messaging.receiveTrainer(zoneType);
		if (zone == undefined) {
			return undefined;
		}

		// Check if we currently plan a pass
		let passPlanned = passInfoTable !== undefined && attackPosition !== undefined && plannedAttackTime !== undefined;

		// Check if we needed to accept the next planned pass last frame
		let prevRobotTime = (this._task instanceof AcceptPass) ? this._task.getLastTime() : undefined;
		let [acceptingPass, _timeLeft] = passInfoTable ? checkPassInfos(this._robot, passInfoTable, false, prevRobotTime) : [false, undefined];
		let escapeToAccept = acceptingPass && this._nextAttackPosition !== undefined &&
		 this._nextPassInfo !== undefined && this._nextSender !== undefined && this._nextFeintpos !== undefined;

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
					this._restartTask = false;
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
				let [passInfo, feintPos] = this._getFeintPosition(sender, passInfoTable!, attackPosition, plannedAttackTime, zone);

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
							this._restartTask = false;
						} else {
							// Need to reconstruct the old FeintPassTask
							this._nextAttackPosition = attackPosition;
							this._nextFeintpos = feintPos;
							this._nextSender = lastFeintPassTarget.passRobot;
							// Use the new passInfo for most recent timing info
							this._nextPassInfo = passInfo;
							this._restartTask = true;
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
								this._restartTask = false;
							} else {
								// Else reconstruct it
								this._nextAttackPosition = attackPosition;
								// Explicitly don't update the feintPos here, since the new one belongs to the new pass
								this._nextFeintpos = lastFeintPassTarget.feintPos;
								this._nextPassInfo = lastPassInfo;
								this._nextSender = lastPassRobot;
								this._restartTask = true;
							}

							doFeintPass = true;
							let feintTarget = { passRobot: lastPassRobot, passInfo: lastPassInfo, feintPos: lastFeintPassTarget.feintPos };
							this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
						} else {
							// Our pass wasn't shot yet ---> it is probably dead. Feint the new pass
							this.applyForMainAttacker(undefined, undefined, 0);
							this._restartTask = true;
							this._nextAttackPosition = attackPosition;
							this._nextFeintpos = feintPos;
							this._nextSender = sender;
							this._nextPassInfo = passInfo;

							doFeintPass = true;
							let feintTarget = { passRobot: sender!, passInfo: passInfo, feintPos: feintPos };
							this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
						}
					}
				// If we can't reach the new pass, but the old one already was shot and we can reach it
				} else if (wasPassShot && this._checkIsOldPassUnreachable(lastFeintPassTarget.feintPos)) {
					// Continue feinting the old pass
					this.applyForMainAttacker(undefined, undefined, 0);
					if (this._task instanceof FeintPassTask) {
						// Reuse the old task if possible
						this._restartTask = false;
					} else {
						// Else reconstruct the old pass
						this._restartTask = true;
						this._nextAttackPosition = attackPosition;
						this._nextFeintpos = lastFeintPassTarget.feintPos;
						this._nextPassInfo = lastPassInfo;
						this._nextSender = lastPassRobot;
					}

					doFeintPass = true;
					let feintTarget = { passRobot: lastPassRobot, passInfo: lastPassInfo, feintPos: lastFeintPassTarget.feintPos };
					this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
				}
				// We can't reach the new one and the old pass is either dead or unreachable ---> do something else
			// We aren't planning a pass, but our old pass was already shot and we can reach it
			} else if (wasPassShot && this._checkIsOldPassUnreachable(lastFeintPassTarget.feintPos)) {
				// Continue feinting the old pass
				this.applyForMainAttacker(undefined, undefined, 0);

				if (this._task instanceof FeintPassTask) {
					// Reuse the old task if possible
					this._restartTask = false;
				} else {
					// Else reconstruct the old pass
					this._restartTask = true;
					this._nextAttackPosition = attackPosition;
					this._nextFeintpos = lastFeintPassTarget.feintPos;
					this._nextPassInfo = lastPassInfo;
					this._nextSender = lastPassRobot;
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
			if (this._robot.pos.orthogonalDistance(this._nextAttackPosition!, this._nextPassInfo!.ballPos) < this._robot.radius + World.Ball.radius + 0.1) {
				this._robot.path.addLine(World.Ball.pos, this._nextPassInfo!.ballPos, this._robot.radius, "PassEvacuation", 1);

				doFeintPass = true;
				let feintTarget = { passRobot: this._nextSender!, passInfo: this._nextPassInfo!, feintPos: this._nextFeintpos! };
				this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "feintpass", payload: feintTarget });
			}

		// We aren't already doing a feint but a pass is being planned
		} else if (passPlanned) {
			let [passInfo, feintPos] = this._getFeintPosition(sender, passInfoTable!, attackPosition, plannedAttackTime!, zone);
			debug.set("newPassReachable", passInfo !== undefined);
			// if the new pass is reachable and is not ours to accept
			if (passInfo !== undefined && feintPos !== undefined && passInfo.target !== this._robot) {
				// Feint the pass
				this.applyForMainAttacker(undefined, undefined, 0);
				this._restartTask = true;
				this._nextAttackPosition = attackPosition;
				this._nextFeintpos = feintPos;
				this._nextSender = sender;
				this._nextPassInfo = passInfo;

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
			if (!this._canDoPasses) {
				amun.log("Dummy can't accept Pass, this is a Bug!");
			}
			return [AcceptPass];
		}

		if (this._restartTask) {
			this._restartTask = false;
			return [FeintPassTask, [this._supportParams, this._nextPassInfo!, this._nextSender!, this._nextFeintpos!, this._nextAttackPosition!], true];
		} else {
			return CONTINUE_TASK;
		}
	}

	// needs feintPos as parameter since this._task.feintPos can be undefined, so this way the method can only be called in situations where
	// feintPos is guaranteed to be defined
	private _checkIsOldPassUnreachable(feintPos: Position): boolean {
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
