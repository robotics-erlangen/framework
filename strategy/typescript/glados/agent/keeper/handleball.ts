import * as debug from "base/debug";
import * as Field from "base/field";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { Objective } from "glados/agent/base/objective";
import { Midfield } from "glados/agent/objective/midfield";
import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { MoveToStaticBall } from "glados/task/attacker/movetostaticball";
import { AggressiveKeeper } from "glados/task/keeper/aggressivekeeper";
import { ChipAway as KeeperChipAway } from "glados/task/keeper/chipaway";
import { Keeper } from "glados/task/keeper/keeper";
import { Pass } from "glados/task/shared/pass";
import * as Attack from "glados/util/attack";
import * as Defense from "glados/util/defense";

export class HandleBall extends Behavior {
	private _pass: {target?: FriendlyRobot, ballPos: Position, time: number} | undefined;
	private _timeBegin: number | undefined = undefined;
	private _objective: Objective | undefined;

	_stop() {
		this._timeBegin = undefined;
		this._objective = undefined;
	}

	check(): Behavior | undefined {
		if (Referee.isStopState() || Referee.isOpponentPenaltyState() || World.GameStage === "PenaltyShootout") {
			return undefined;
		}
		// if a slow ball enters the defense area
		if (Defense.keeperShouldBeMA()) {
			// force being mainAttacker
			this._applyForMainAttacker(undefined, undefined, 2);
		}

		let mainAttackerFlag = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
		return mainAttackerFlag
			? this
			: undefined;
	}

	_updateTask(): TaskAssignment<typeof Keeper> | TaskAssignment<typeof Pass> | TaskAssignment<typeof KeeperChipAway>
			| TaskAssignment<typeof AggressiveKeeper> | TaskAssignment<typeof MoveToStaticBall> {
		if (!this._objective) {
			this._objective = new Midfield(this._agent);
		}
		this._messaging.sendBroadcast(MessageType.selectedObjective, this._objective);

		let endPos = Physics.ballAtTime(World.Ball, Infinity).pos;
		let startInside = Field.isInFriendlyDefenseArea(World.Ball.pos, -World.Ball.radius - this._robot.radius);
		let endInside = Field.isInFriendlyDefenseArea(endPos, -World.Ball.radius - this._robot.radius);

		// check if there is a danger of a own goal
		let ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0);
		let robotDist = Field.distanceToFriendlyGoalLine(this._robot.pos, 0);
		let ballBehindKeeper = ballDist < robotDist;

		let suggestions = this._messaging.receive(MessageType.passSuggestion);
		if (startInside && endPos.y < World.Geometry.FriendlyGoal.y + 0.01) {
			// if ball is inside defense area and will enter the goal -> block the ball
			return [Keeper];
		} else if (startInside && endInside && !ballBehindKeeper && suggestions) {
			// if ball is inside defense area and will not leave it -> we have time to act
			// try to find a good pass
			if (this._timeBegin == undefined) {
				this._timeBegin = World.Time;
			}
			const earliestAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime, true)[1];
			this._pass = Attack.choosePassFromSuggestions(this._robot, suggestions, {
				earliestAttackTime,
				attackPosition: undefined,
				currentPassPos: this._pass?.ballPos,
				considerTiming: false,
				ratePass: Attack.defaultRatePass,
			})[0];
			if (this._pass != undefined) { // check if there is a good pass, else chip away
				if (this._pass.target) {
					if (this._task != undefined && this._task instanceof Pass) {
						this._task.updateTarget(this._pass.target, this._pass.ballPos, true);
					}
					this._messaging.sendBroadcast(MessageType.passInfo, [{ target: this._pass.target,
						ballPos: this._pass.ballPos, time: this._pass.time}]);
				}

				return [
					Pass, [{
						targetRobot: this._pass.target,
						targetPos: this._pass.ballPos,
						chip: true,
						highPrecision: true,
					}],
				];
			}
			if (World.Time - this._timeBegin < 7) {
				return [MoveToStaticBall];
			} else {
				return [KeeperChipAway];
			}
		} else {
			// if inside and ball will leave or outside -> get rid of the ball
			return [AggressiveKeeper];
		}
	}
}
