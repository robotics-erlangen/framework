import * as debug from "base/debug";
import * as Field from "base/field";
import { some } from "base/listutil";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { BreakPass as BreakPassTask } from "glados/task/defender/breakpass";

export class BreakPass extends Behavior {

	private lastOppFirstAtBall: Map<Robot, boolean> = new Map();

	_stop() {

	}

	check(): Behavior | undefined {
		const mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		const isMainAttacker = mainAttacker === this._robot;
		if (isMainAttacker) {
			debug.set("breakpass check", "main attacker");
			return undefined;
		}

		if (!Referee.isGameState(World.RefereeState)) {
			debug.set("breakpass check", "non game state");
			return undefined;
		}

		// no pass
		if (World.Ball.speed.lengthSq() < 2 * 2) {
			debug.set("breakpass check", "no pass");
			return undefined;
		}

		// this robots own pass
		if (Ball.friendlyBallOwner() === this._robot) {
			debug.set("breakpass check", "pass of own robot");
			return undefined;
		}

		// ball is to close to friendly defense area
		if (World.Ball.pos.y < -World.Geometry.FieldHeightQuarter) {
			debug.set("breakpass check", "ball is to close to our defense area");
			return undefined;
		}

		let [moveDest, endSpeed, waitingTime] = BreakPassTask.calculateBreakPos(this._robot);
		let breakPassThreshold = 0;
		if (this._active) {
			breakPassThreshold = 0.1;
		}
		// pass is not breakable
		let acceptableWaitTime = -2 * this._robot.radius / endSpeed.length();
		if (waitingTime < acceptableWaitTime + (this._active ? -0.1 : 0)) {
			debug.set("breakpass check", "pass is not breakable");
			return undefined;
		}

		// moveDest is to close to friendly defense area
		if (moveDest.y < -World.Geometry.FieldHeightQuarter) {
			debug.set("breakpass check", "moveDest is to close to our defense area");
			return undefined;
		}

		// moveDest is not in allowed field
		if (!Field.isInAllowedField(moveDest, -World.Ball.radius)) {
			debug.set("breakpass check", "not in allowed field");
			return undefined;
		}

		// moveDest is in friendly goal
		if (Field.isInFriendlyGoal(moveDest)) {
			debug.set("breakpass check", "is in friendly goal");
			return undefined;
		}

		// moveDest is in opponent goal
		if (Field.isInOpponentGoal(moveDest)) {
			debug.set("breakpass check", "is in opponent goal");
			return undefined;
		}

		// moveDest is behind the ball/pass
		let toPos = moveDest - World.Ball.pos;
		if (World.Ball.speed.dot(toPos) <= 0) {
			debug.set("breakpass check", "moveDest is behind the pass");
			return undefined;
		}

		// waiting time is not over
		if (breakPassThreshold < (waitingTime - BreakPassTask.BUFFER_TIME)) {
			debug.set("breakpass check", "waiting time is not over");
			return undefined;
		}

		// moveDest is behind the MA
		if (mainAttacker && World.Ball.speed.dot(mainAttacker.pos - World.Ball.pos) < World.Ball.speed.dot(toPos)) {
			let offset = (World.Ball.pos - mainAttacker.pos).withLength(this._robot.shootRadius + World.Ball.radius);
			let timeToMA = Physics.checkedBallTravelTime(World.Ball, mainAttacker.pos + offset);
			let futureBall = Physics.ballAtTimeExperimental(World.Ball, timeToMA);
			if (timeToMA < 0 || futureBall.posZ == undefined || futureBall.posZ < mainAttacker.height) {
				debug.set("breakpass check", "behind MA");
				return undefined;
			}
		}

		// do if already running and ball will hit the robot
		if (this._active && this._robot.pos.distanceTo(World.Ball.pos) <= 1 && this._robot.pos.orthogonalDistance(World.Ball.pos, World.Ball.pos + World.Ball.speed) <= 2 * this._robot.radius) {
			debug.set("breakpass check", "hysteresis");
			return this;
		}

		// main attacker will receive the pass
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		if (attackPosition != undefined) {
			let timeToMA = Physics.checkedBallTravelTime(World.Ball, attackPosition);
			let futureBall = Physics.ballAtTimeExperimental(World.Ball, timeToMA);
			if (timeToMA < 0 || futureBall.posZ == undefined || futureBall.posZ < this._robot.height) {
				const timeBallToTarget = Physics.ballRollTime(World.Ball, World.Ball.pos.distanceTo(attackPosition!));
				const oppInPassZone = some(World.OpponentRobots, (opp) => {
					// Check if the opponent could reach the ball faster than the ball its target
					const hysteresis = this.lastOppFirstAtBall[opp] ? 0 : -0.1;
					const oppFaster = ObserverRobot.minTimeToBall(opp) < timeBallToTarget + hysteresis;
					this.lastOppFirstAtBall[opp] = oppFaster;
					return oppFaster;
				});
				if (!oppInPassZone) {
					debug.set("breakpass check", "main attacker will receive the ball");
					return undefined;
				}
			}
		}

		debug.set("breakpass check", "true");
		return this;
	}

	_updateTask(): TaskAssignment<typeof BreakPassTask> {
		return [BreakPassTask];
	}

}
