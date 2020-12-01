import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Robot from "glados/observer/robot";
import * as Shoot from "glados/observer/shoot";
import { MoveToStaticBall } from "glados/task/attacker/movetostaticball";
import { ShootGoal } from "glados/task/attacker/shootgoal";
import { Pass as TaskPass } from "glados/task/shared/pass";
import * as Attack from "glados/util/attack";
import * as ShootGoalUtil from "glados/util/shootgoal";


enum State {
	Prepare = "Prepare",
	Wait = "Wait",
	ShootGoal = "ShootGoal",
	PassPrepare = "PassPrepare",
	Pass = "Pass",
}

interface Pass {
	target?: FriendlyRobot;
	ballPos: Position;
	time: number;
	chip?: boolean;
}

export class FreeKick extends Behavior {
	_startTime: number = 0;
	_state: State = State.Prepare;
	_dirty: boolean = false;
	_passList: Pass[] | undefined = undefined;
	_pass: Pass | undefined = undefined;
	_waitStartTime: number | undefined = undefined;
	_redeciding: boolean = false;


	_stop() {
		this._startTime = 0;
		this._state = State.Prepare;
		this._dirty = false;
		this._passList = undefined;
		this._pass = undefined;
		this._waitStartTime = undefined;
		this._redeciding = false;
	}

	start() {
		this._startTime = World.Time;
	}

	check(): Behavior | undefined {
		// we have to be main attacker
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) !== this._robot) {
			return undefined;
		}

		if (Referee.isFriendlyFreeKickState()) {
			this._forceKeepingInPool = true;
			return this;
		}

		// stay active for one additional frame to avoid flickering to a different task
		// rely on being killed by applyForMainAttacker
		if (Robot.ownStandardShooter() === this._robot) {
			return this;
		}

		return undefined;
	}

	_updateTask(): TaskAssignment<typeof TaskPass> | TaskAssignment<typeof ShootGoal> | TaskAssignment<typeof MoveToStaticBall> {
		let prevState = this._state;

		let ballDefenseDist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0);
		let distanceToBall = Math.max(0.01, Math.min(0.15, ballDefenseDist - 2 * this._robot.radius - World.Ball.radius - 0.04));
		let nearBall = this._robot.pos.distanceTo(World.Ball.pos)
			< distanceToBall + this._robot.radius + World.Ball.radius + 0.02;

		this._dirty = ShootGoalUtil.updateTarget(this._robot, undefined, this._dirty, World.Ball.pos)[2];
		let shootgoalPossible = !this._dirty && World.Ball.pos.y > -0.2  &&
			(World.RefereeState === "DirectOffensive" || World.RefereeState === "KickoffOffensive");

		// prepare -> wait
		if (this._state === State.Prepare && nearBall) {
			this._state = State.Wait;
			this._waitStartTime = World.Time;
		}

		// wait -> shootgoal
		// wait -> pass_prepare
		const MIN_WAIT_TIME = 1;
		const MAX_TIMEFRAME = Referee.isFriendlyFreeKickState() ? 4 : 8;
		let timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME;
		if (this._state === State.Wait) {
			if (shootgoalPossible) {
				this._state = State.ShootGoal;
				this._passList = undefined;
			} else if (timeRunningOut)  {
				this._state = State.ShootGoal;
			} else if (World.Time - <number> this._waitStartTime > MIN_WAIT_TIME) {
				let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
				const earliestAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1];
				this._passList = Attack.sortPassesFromSuggestions(this._robot, passSuggestions, {
					earliestAttackTime,
					considerTiming: false,
					ratePass: Attack.defaultRatePass,
				});
				if (this._passList != undefined) {
					for (let pass of this._passList.values()) {
						// check this pass for timing-posibilities
						let timeDiff = pass.time - Referee.lastStateChangeTime() - Shoot.ballPassTime(World.Ball.pos, pass.ballPos, pass.target, undefined, this._robot);

						if (timeDiff < MAX_TIMEFRAME - 1.5) {
							this._pass = pass;
							this._pass.time = this._pass.time + 1.5;
							this._state = State.PassPrepare;
							break;
						}

						if (timeDiff < MAX_TIMEFRAME) {
							this._pass = pass;
							this._state = State.PassPrepare;
						}
					}
					if (this._pass === undefined) {
						this._passList = undefined;
					}
				}
			}
		}

		// check for anonymous pass
		let restartTask = this._redeciding;
		if (this._state === State.PassPrepare || this._state === State.Pass) {
			if (this._pass != undefined && this._pass.target == undefined) {
				// try to find the target
				// look for a suggestion that matches our pass
				let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
				const earliestAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1];
				let passes = Attack.sortPassesFromSuggestions(this._robot, passSuggestions, {
					earliestAttackTime,
					considerTiming: false,
					threshold: 0,
					ratePass: Attack.defaultRatePass,
				});
				if (passes) {
					for (let pass of passes) {
						if (pass.target != undefined && pass.ballPos.distanceTo(this._pass.ballPos) < 0.1) {
							this._pass.target = pass.target;
							if (this._state === State.Pass) {
								restartTask = true;
							}
						}
					}
				}
			}
		}

		let pass: Pass = <Pass> this._pass;
		let adjustTiming = this._state === State.PassPrepare;
		let remainingTime = MAX_TIMEFRAME - (World.Time - Referee.lastStateChangeTime());
		if (this._state === State.Pass) {
			let passShootTime = pass.time - Shoot.ballPassTime(World.Ball.pos, pass.ballPos, pass.target, undefined, this._robot);
			adjustTiming = adjustTiming || (passShootTime - World.Time > 0.5);
		}
		if (adjustTiming && !timeRunningOut) {
			let suggestion = this._messaging.receive(MessageType.passSuggestion).get(pass.target!);
			if (suggestion && suggestion.ballPos.distanceTo(pass.ballPos) < 0.01) {
				let bufferTime = 0.1;
				if (suggestion.time - pass.time > bufferTime * 0.5 && suggestion.time + bufferTime < World.Time + remainingTime) {
					pass.time = suggestion.time + bufferTime;
					restartTask = true;
				}
			}
		}

		if (this._state === State.Pass && timeRunningOut) {
			this._state = State.Wait;
		}

		// pass_prepare -> pass
		if (this._state === State.PassPrepare) {
			let shootPos = pass.ballPos;
			let ballTime = Shoot.ballPassTime(World.Ball.pos, shootPos, pass.target, undefined, this._robot);
			let extraTime = Math.abs(geom.getAngleDiff(this._robot.dir, (shootPos - this._robot.pos).angle())) / Math.PI * 1.3 + 0.2;
			let robotTime = Robot.minShootTime(this._robot, shootPos) + extraTime;
			if (World.Time + robotTime + ballTime >= pass.time) {
				this._state = State.Pass;
			}

			// redecide if beneficial
			let enoughTime = World.Time - Referee.lastStateChangeTime() <= MAX_TIMEFRAME - 1.5;
			if (enoughTime) {
				let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
				let newPass = Attack.choosePassFromSuggestions(this._robot, passSuggestions, {
					earliestAttackTime: this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1],
					currentPassPos: pass.ballPos,
					considerTiming: false,
					customHysteresis: 0.05,
					ratePass: Attack.defaultRatePass,
				})[0];
				if (newPass != undefined && newPass.ballPos.distanceTo(pass.ballPos) > 0.2) {
					// check if the pass is valid, i.e. in time.
					let timeDiff = newPass.time - Referee.lastStateChangeTime() - Shoot.ballPassTime(World.Ball.pos, newPass.ballPos, newPass.target, undefined, this._robot);
					if (timeDiff < MAX_TIMEFRAME) {
						this._state = State.Wait; // wait state will deal with setting up a new pass
					}
				}
			}
		}

		// delay the pass if the receiver is not ready yet
		if (this._state === State.Pass) {
			let passSuggestion = this._messaging.receive(MessageType.passSuggestion).get(pass.target!);
			if (passSuggestion && passSuggestion.ballPos === pass.ballPos) {
				let timeDiff = passSuggestion.time - Referee.lastStateChangeTime() - Shoot.ballPassTime(World.Ball.pos, pass.ballPos, pass.target, undefined, this._robot);
				if (pass.time < passSuggestion.time && timeDiff < MAX_TIMEFRAME) {
					if (timeDiff < MAX_TIMEFRAME) {
						pass.time = passSuggestion.time;
					} else {
						this._state = State.Wait; // this pass will exceed the time we have for an freekick
					}
				}
			}
		}


		type PassInfo = {target: FriendlyRobot, ballPos: Position, time: number};
		if (this._passList != undefined && this._state === State.Pass) {
			this._messaging.sendBroadcast(MessageType.passInfo, [<PassInfo> this._pass]);
		} else if (this._passList != undefined) {
			this._messaging.sendBroadcast(MessageType.passInfo, <PassInfo[]> this._passList);
		}

		// visualize decision
		let visTarget;
		if (this._pass) {
			visTarget = this._pass.ballPos;
		} else if (this._state === State.ShootGoal) {
			visTarget = World.Geometry.OpponentGoal;
		}
		if (visTarget) {
			Attack.visualizeAttack(this._robot.pos, visTarget);
		}



		debug.set("state", this._state);
		debug.set("remaining time", remainingTime);
		let stateChanged = prevState === this._state;

		if (this._pass != undefined) {
			debug.push("pass", this._pass.target != undefined ? String(this._pass.target.id) : "anonymous");
			debug.set("ballPos", this._pass.ballPos);
			debug.set("time (rel)", this._pass.time - World.Time);
			debug.set("time (abs)", this._pass.time);
			debug.set("chip", this._pass.chip);
			debug.pop();
		} else {
			debug.set("pass", undefined);
		}

		let PASS_TIMEFRAME = 3;
		switch (this._state) {
			case State.Prepare:
				this._messaging.sendBroadcast(MessageType.plannedAttackTime, Referee.lastStateChangeTime() + PASS_TIMEFRAME);
				return [MoveToStaticBall, [ Math.PI / 2, distanceToBall ], stateChanged];
			case State.ShootGoal:
				return [ShootGoal, [ undefined, undefined, timeRunningOut]];
			case State.Wait:
			case State.PassPrepare:
				this._messaging.sendBroadcast(MessageType.plannedAttackTime, Referee.lastStateChangeTime() + PASS_TIMEFRAME);
				return [MoveToStaticBall, [ Math.PI / 2 ], stateChanged];
			case State.Pass:
				const pass = <Pass> this._pass;
				if (this._task != undefined && this._task instanceof TaskPass) {
					this._task.updateTarget(pass.target!, pass.ballPos, undefined, pass.time);
				}
				return [TaskPass, [ pass.target, pass.ballPos, pass.chip, World.Ball.pos, pass.time ], restartTask];
		}
	}
}
