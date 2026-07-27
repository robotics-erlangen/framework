/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
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

export class FreeKick extends Behavior {
	private _state: {
		tag: State.Prepare | State.Wait | State.ShootGoal;
		pass?: undefined;
		passList?: undefined;
	} | {
		tag: State.PassPrepare | State.Pass;
		pass: Attack.PassInfo;
		passList: Attack.PassInfo[];
	} = { tag: State.Prepare };

	private _dirty: boolean = false;
	private _waitStartTime: number | undefined = undefined;
	private _ratePass: Attack.PassRater;

	public constructor(agent: Agent, ratePass: Attack.PassRater) {
		super(agent);
		this._ratePass = ratePass;
	}

	protected _stop() {
		this._state = {
			tag: State.Prepare,
		};

		this._dirty = false;
		this._waitStartTime = undefined;
	}

	public check(): Behavior | undefined {
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

	protected _updateTask(): TaskAssignment<typeof TaskPass> | TaskAssignment<typeof ShootGoal> | TaskAssignment<typeof MoveToStaticBall> {
		let prevState = this._state;

		let ballDefenseDist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0);
		let distanceToBall = Math.max(0.01, Math.min(0.15, ballDefenseDist - 2 * this._robot.radius - World.Ball.radius - 0.04));
		let nearBall = this._robot.pos.distanceTo(World.Ball.pos)
			< distanceToBall + this._robot.radius + World.Ball.radius + 0.02;

		this._dirty = ShootGoalUtil.updateTarget(this._robot, undefined, this._dirty, World.Ball.pos)[2];
		const [shootgoalPossible, _] = ShootGoalUtil.shootGoalPossible(this._robot, World.Ball.pos);

		// prepare -> wait
		if (this._state.tag === State.Prepare && nearBall) {
			this._state = {
				tag: State.Wait,
			};
			this._waitStartTime = World.Time;
		}

		// wait -> shootgoal
		// wait -> pass_prepare
		const MIN_WAIT_TIME = 1;
		const MAX_TIMEFRAME = Referee.isFriendlyFreeKickState() ? 4 : 8;
		let timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME;
		if (this._state.tag === State.Wait) {
			if (shootgoalPossible || timeRunningOut) {
				this._state = {
					tag: State.ShootGoal,
				};
			} else if (World.Time - <number> this._waitStartTime > MIN_WAIT_TIME) {
				let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
				const earliestAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1];

				const passList = Attack.sortPassesFromSuggestions(this._robot, passSuggestions, {
					earliestAttackTime,
					attackPosition: undefined,
					considerTiming: false,
					ratePass: this._ratePass,
				});

				let pass = undefined;
				for (const suggestion of passList) {
					// check this pass for timing-posibilities
					let timeDiff = suggestion.time - Referee.lastStateChangeTime() - Shoot.ballPassTime(World.Ball.pos, suggestion.ballPos, suggestion.target, undefined, this._robot);

					if (timeDiff < MAX_TIMEFRAME - 1.5) {
						pass = suggestion;
						pass.time += 1.5;
						break;
					}

					if (timeDiff < MAX_TIMEFRAME) {
						pass = suggestion;
					}
				}

				if (pass !== undefined) {
					this._state = {
						tag: State.PassPrepare,
						pass,
						passList,
					};
				}
			}
		}

		// check for anonymous pass
		let restartTask = false;
		if ((this._state.tag === State.PassPrepare || this._state.tag === State.Pass)
				&& this._state.pass.target === undefined) {
			// try to find the target
			// look for a suggestion that matches our pass
			let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
			const earliestAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1];
			const passes = Attack.sortPassesFromSuggestions(this._robot, passSuggestions, {
				earliestAttackTime,
				considerTiming: false,
				threshold: 0,
				ratePass: this._ratePass,
			});

			for (const pass of passes) {
				if (pass.target != undefined && pass.ballPos.distanceTo(this._state.pass.ballPos) < 0.1) {
					this._state.pass.target = pass.target;
					if (this._state.tag === State.Pass) {
						restartTask = true;
					}
				}
			}
		}

		const remainingTime = MAX_TIMEFRAME - (World.Time - Referee.lastStateChangeTime());
		if (this._state.tag === State.PassPrepare || this._state.tag === State.Pass) {
			const pass = this._state.pass;

			let adjustTiming = false;
			if (this._state.tag === State.PassPrepare) {
				adjustTiming = true;
			} else {
				const passShootTime = pass.time - Shoot.ballPassTime(World.Ball.pos, pass.ballPos, pass.target, undefined, this._robot);
				adjustTiming = passShootTime - World.Time > 0.5;
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
		}

		if (this._state.tag === State.Pass && timeRunningOut) {
			this._state = {
				tag: State.Wait,
			};
		}

		// pass_prepare -> pass
		if (this._state.tag === State.PassPrepare) {
			const pass = this._state.pass;

			let shootPos = pass.ballPos;
			let ballTime = Shoot.ballPassTime(World.Ball.pos, shootPos, pass.target, undefined, this._robot);
			let extraTime = Math.abs(geom.getAngleDiff(this._robot.dir, (shootPos - this._robot.pos).angle())) / Math.PI * 1.3 + 0.2;
			let robotTime = Robot.minShootTime(this._robot, shootPos) + extraTime;
			if (World.Time + robotTime + ballTime >= pass.time) {
				this._state = {
					tag: State.Pass,
					pass,
					passList: this._state.passList,
				};
			}

			// redecide if beneficial
			let enoughTime = World.Time - Referee.lastStateChangeTime() <= MAX_TIMEFRAME - 1.5;
			if (enoughTime) {
				let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
				let newPass = Attack.choosePassFromSuggestions(this._robot, passSuggestions, {
					earliestAttackTime: this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1],
					attackPosition: undefined,
					currentPassPos: pass.ballPos,
					considerTiming: false,
					customHysteresis: 0.05,
					ratePass: this._ratePass,
				})[0];
				if (newPass != undefined && newPass.ballPos.distanceTo(pass.ballPos) > 0.2) {
					// check if the pass is valid, i.e. in time.
					let timeDiff = newPass.time - Referee.lastStateChangeTime() - Shoot.ballPassTime(World.Ball.pos, newPass.ballPos, newPass.target, undefined, this._robot);
					if (timeDiff < MAX_TIMEFRAME) {
						// wait state will deal with setting up a new pass
						this._state = {
							tag: State.Wait,
						};
					}
				}
			}
		}

		// delay the pass if the receiver is not ready yet
		if (this._state.tag === State.Pass) {
			const pass = this._state.pass;

			let passSuggestion = this._messaging.receive(MessageType.passSuggestion).get(pass.target!);
			if (passSuggestion && passSuggestion.ballPos === pass.ballPos) {
				let timeDiff = passSuggestion.time - Referee.lastStateChangeTime() - Shoot.ballPassTime(World.Ball.pos, pass.ballPos, pass.target, undefined, this._robot);
				if (pass.time < passSuggestion.time && timeDiff < MAX_TIMEFRAME) {
					if (timeDiff < MAX_TIMEFRAME) {
						pass.time = passSuggestion.time;
					} else {
						// this pass will exceed the time we have for an freekick
						this._state = {
							tag: State.Wait,
						};
					}
				}
			}
		}


		if (this._state.tag === State.Pass) {
			this._messaging.sendBroadcast(MessageType.passInfo, [this._state.pass]);
		} else if (this._state.tag === State.PassPrepare) {
			this._messaging.sendBroadcast(MessageType.passInfo, this._state.passList);
		}

		// visualize decision
		let visTarget;
		if (this._state.pass) {
			visTarget = this._state.pass.ballPos;
		} else if (this._state.tag === State.ShootGoal) {
			visTarget = World.Geometry.OpponentGoal;
		}
		if (visTarget) {
			Attack.visualizeAttack(this._robot.pos, visTarget);
		}



		debug.set("state", this._state.tag);
		debug.set("remaining time", remainingTime);
		let stateChanged = prevState === this._state;

		if (this._state.pass != undefined) {
			const pass = this._state.pass;
			debug.push("pass", pass.target != undefined ? String(pass.target.id) : "anonymous");
			debug.set("ballPos", pass.ballPos);
			debug.set("time (rel)", pass.time - World.Time);
			debug.set("time (abs)", pass.time);
			debug.set("chip", pass.chip);
			debug.pop();
		} else {
			debug.set("pass", undefined);
		}

		let prepareRobotAngle = Attack.freekickPrepareRobotAngle();

		const PASS_TIMEFRAME = 3;
		switch (this._state.tag) {
			case State.Prepare:
				this._messaging.sendBroadcast(MessageType.plannedAttackTime, Referee.lastStateChangeTime() + PASS_TIMEFRAME);
				return [MoveToStaticBall, [prepareRobotAngle, distanceToBall], stateChanged];
			case State.ShootGoal:
				return [ShootGoal, [undefined, undefined, timeRunningOut, true]];
			case State.Wait:
			case State.PassPrepare:
				this._messaging.sendBroadcast(MessageType.plannedAttackTime, Referee.lastStateChangeTime() + PASS_TIMEFRAME);
				return [MoveToStaticBall, [prepareRobotAngle], stateChanged];
			case State.Pass:
				const pass = this._state.pass;
				if (this._task != undefined && this._task instanceof TaskPass) {
					this._task.updateTarget(pass.target!, pass.ballPos, undefined, pass.time);
				}
				return [
					TaskPass, [{
						targetRobot: pass.target,
						targetPos: pass.ballPos,
						chip: pass.chip,
						ballReceiptPos: World.Ball.pos,
						targetTime: pass.time,
					}],
					restartTask
				];
		}
	}

	public addDebugInfo() {
		debug.set(undefined, "FreeKick");
		debug.set("ratePass", this._ratePass.name);
	}
}
