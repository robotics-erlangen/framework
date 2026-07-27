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

import { throwInDebug } from "base/amun";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { CenterBack } from "glados/task/defender/centerback";
import { InterceptPass } from "glados/task/defender/interceptpass";
import { Duel } from "glados/task/shared/duel";
import * as Attack from "glados/util/attack";
import * as DefUtil from "glados/util/defense";
import * as Rating from "glados/util/rating";

const G = World.Geometry;

function rateRobot(robot: FriendlyRobot) {
	let [bestPos, posTime, bestRatingOppTime] = InterceptPass.calculateInterceptPos(robot);
	let distanceToInterceptPos = robot.pos.distanceTo(<Position> bestPos);
	let timeToInterceptPos = <number> posTime;
	let timeOppToInterceptPos = bestRatingOppTime;
	let differenceSelfAndOppToInterceptPos = timeToInterceptPos - timeOppToInterceptPos;

	let rateDistanceToInterceptPos = Rating.valueToRating(distanceToInterceptPos, 3, 0);
	let rateDifferenceSelfAndOppToInterceptPos = Rating.valueToRating(
													differenceSelfAndOppToInterceptPos, 0, 1);

	return (rateDistanceToInterceptPos + (2 * rateDifferenceSelfAndOppToInterceptPos)) / 3;
}

export class HandleBall extends Behavior {
	private _taskDecision: string | undefined = undefined;
	private _forceDefenderFrameCounter: number = 0;
	private _lastDuelWasWon: boolean = false;

	protected _stop() {
		this._taskDecision = undefined;
		this._lastDuelWasWon = false;
	}

	public start() {
		if (DefUtil.dangerousBallTowardsDefense() || Ball.isAccelerating()) {
			this._forceDefenderFrameCounter = 0;
		}
	}

	private _checkDefender(): boolean {
		// stay defender if the ball is currently being shot at our goal
		if (!DefUtil.dangerousBallTowardsDefense() && !Ball.isAccelerating()) {
			this._forceDefenderFrameCounter = this._forceDefenderFrameCounter + 1;
		} else {
			this._forceDefenderFrameCounter = 0;
		}

		if (this._forceDefenderFrameCounter < 5) {
			let assignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
			if (assignment !== undefined && assignment.name === "CenterBack") {
				return true;
			}
			let cbGroup = this._messaging.receiveTrainer(MessageType.centerBackPosTarget);
			if (cbGroup !== undefined) {
				return true;
			}
		}

		return false;
	}

	private readonly _DUEL_WIN_DISTANCE = 4 * this._robot.radius;
	private readonly _DUEL_WIN_HYSTERESIS = 0.5 * this._robot.radius;

	private _checkAttacker(): boolean {
		let isAttacker = this._taskDecision === "attacker";

		// don't if we take too long to get the ball
		let timeDiff = isAttacker ? 0.5 : 1.0;
		let distanceFactor = isAttacker ? 1 : 1.5;
		let distanceOffset = isAttacker ? 3 * this._robot.radius : 5 * this._robot.radius;
		let [firstOpp, firstOppTime] = Ball.firstRobotAtBall(World.OpponentRobots);

		let minDistance = this._DUEL_WIN_DISTANCE + this._DUEL_WIN_HYSTERESIS * (this._lastDuelWasWon ? -1 : 1);

		// Do if we won a duel and are now in safe ball posession
		if (firstOpp && ObserverRobot.hadBall(this._robot, 0) && firstOpp.pos.distanceTo(this._robot.pos) > minDistance) {
			this._lastDuelWasWon = true;
			return true;
		}
		this._lastDuelWasWon = false;

		if (firstOppTime < ObserverRobot.minTimeToBall(this._robot) + timeDiff) {
			// do if we are pretty close to our acceptPos
			let acceptPos = Physics.ballAtTime(World.Ball, ObserverRobot.minTimeToBall(this._robot)).pos;
			let enemyPos = Physics.ballAtTime(World.Ball, firstOppTime).pos;
			if (this._robot.pos.distanceTo(acceptPos) * distanceFactor + distanceOffset > (firstOpp as Robot).pos.distanceTo(enemyPos)) {
				return false;
			}
			if (World.Ball.pos.distanceTo(acceptPos) + distanceOffset > World.Ball.pos.distanceTo(enemyPos) && !Ball.isSlowBall()) {
				return false;
			}
		}

		// true if we are in opponentFieldHalf
		if (this._robot.pos.y > G.FieldHeightHalf * 0.1) {
			return true;
		}

		// don't if an opponent is close to us
		let distToOppLimit = isAttacker ? 0.3 : 0.5;
		let closestOppDist = DefUtil.getClosestRobot(World.OpponentRobots, this._robot.pos)[1];
		if (closestOppDist < distToOppLimit) {
			return false;
		}

		// don't if an opponent receives a pass
		for (let r of World.OpponentRobots) {
			if (Ball.receivesPass(r) && (r.pos.distanceTo(World.Ball.pos) < 1.0 || r.pos.distanceTo(this._robot.pos) < 1.0)) {
				return false;
			}
		}

		return true;
	}

	private _checkInterceptPass() {

		let isInterceptPass = this._taskDecision === "interceptpass"
								|| (this._messaging.receiveTrainer(MessageType.interceptPass) === this._robot);

		// don't if we want to intercept our own pass
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo);
		if (sender && Attack.currentPlannedMainAttacker(sender, passInfoTable!)) {
			return false;
		}

		// don't if the ball is too slow
		let ballSpeedLimit = isInterceptPass ? 1.5 : 2.0;
		if (World.Ball.speed.length() < ballSpeedLimit) {
			return false;
		}

		let [moveDest, moveTime] = InterceptPass.calculateInterceptPos(this._robot);
		if (moveDest == undefined) {
			return false;
		}

		vis.addCircle("InterceptPassPos", moveDest, 0.05, vis.colors.cyan, true);
		vis.addPath("InterceptPassPos", [this._robot.pos, moveDest], vis.colors.cyan);
		debug.set("moveTime", moveTime);

		// don't intercept chip kicks
		if (Ball.isFlyingOrBouncing()) {
			let offset = (World.Ball.pos - moveDest).withLength(this._robot.shootRadius + World.Ball.radius);
			let interceptTime = Physics.checkedBallTravelTime(World.Ball, moveDest + offset);
			let futureBall = Physics.ballAtTimeExperimental(World.Ball, interceptTime);
			if (interceptTime < 0 || futureBall.posZ == undefined || futureBall.posZ > World.Ball.radius) {
				return false;
			}
		}

		// don't if the time to intercept the pass is too high
		let interceptionTimeLimit = isInterceptPass ? 1.5 : 1.0;
		if (moveTime == undefined || moveTime > interceptionTimeLimit) {
			return false;
		}

		// don't intercept if there is no pass receiver
		let receivers = Goal.predictShot()[3];
		if (receivers == undefined || receivers.length === 0) {
			return false;
		}

		let interceptPosDist = (this._robot.pos - World.Ball.pos).length();
		let interceptPosBehindReceivers = receivers.every((opponentRobot) => {
			let robot = opponentRobot.robot;

			return interceptPosDist > (robot.pos - World.Ball.pos).length();
		});

		// don't intercept if intercept position is behind the receivers
		if (interceptPosBehindReceivers) {
			return false;
		}

		// don't intercept if it might have been kicked by our goalie
		let defenseIntersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, new Vector(1, 0),
					World.Ball.pos, -World.Ball.speed)[0];
		let defenseWidthHalf = Field.defenseBaselineIntersectionDistance() + 0.2;
		if (defenseIntersection != undefined && Math.abs(defenseIntersection.x) < defenseWidthHalf) {
			return false;
		}

		let rating = rateRobot(this._robot);
		let ratingArg: Rating.LeveledRating = new Rating.LeveledRating(MessageType.interceptPass);
		ratingArg.setRating(0, rating);
		this._messaging.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.interceptPass, ratingArg]);
		return (this._messaging.receiveTrainer(MessageType.interceptPass) === this._robot);

	}

	private _checkDuel(): boolean {
		// don't if we are not close to the ball
		let ballDistLimit = this._taskDecision === "duel" ? 1.2 : 0.8;
		if (this._robot.pos.distanceTo(World.Ball.pos) > ballDistLimit) {
			return false;
		}

		// don't if the ball is moving horizontally (e.g. for a pass)
		if (Math.abs(World.Ball.speed.x) > 2) {
			return false;
		}
		return true;
	}

	public check(): Behavior | undefined {
		if (Referee.isFriendlyFreeKickState() || Referee.isStopState() || Referee.isKickoffState()
				|| Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)) {
			return undefined;
		}

		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);

		if (this._checkDefender()) {
			this._taskDecision = "forcedefender";
		} else if (this._checkInterceptPass()) {
			this._taskDecision = "interceptpass";
		} else if (this._checkAttacker()) {
			this._taskDecision = "attacker";
		} else if (this._checkDuel()) {
			this._taskDecision = "duel";
		} else {
			this._taskDecision = "defender";
		}

		debug.set("HandleBall", this._taskDecision);

		if (this._taskDecision !== "forcedefender"
				&& (mainAttacker === this._robot
					|| this._taskDecision === "attacker"
					|| this._taskDecision === "duel")
				&& this._taskDecision !== "interceptpass") {
			this.applyForMainAttacker();
		}

		return (mainAttacker === this._robot) || (this._messaging.receiveTrainer(MessageType.interceptPass) === this._robot)
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof InterceptPass> | TaskAssignment<typeof Duel> |
			TaskAssignment<typeof CenterBack> {
		const isMainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;

		if (isMainAttacker) {
			const [, receivedObjective] = this._messaging.receiveSingleSender(MessageType.selectedObjective, true);
			/* Everytime we have a main attacker, we need an objective. *Maybe*
			 * we want the same logic as SelectObjective here, for now we
			 * simply keep the old objective alive
			 */
			if (!receivedObjective) {
				throwInDebug("a/d/handleball: No objective to propagate");
			} else {
				this._messaging.sendBroadcast(MessageType.selectedObjective, receivedObjective);
			}
		}

		let selfDefenseDist = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius);
		if (selfDefenseDist < DefUtil.centerBackDistanceToDefenseArea() + this._robot.radius + 0.03) {
			// TODO: EVACUATE or EVACUATING
			// this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "centerback", payload: {} });
		}

		// handle the case that we decided forcedefender and want to be centerback but are still mainAttacker
		// if we do not do this, Duel is run but without applying for mainAttacker which creates a cycle
		let cbGroup = this._messaging.receiveTrainer(MessageType.centerBackPosTarget);
		if (cbGroup !== undefined && cbGroup.target && this._taskDecision === "forcedefender") {
			return [CenterBack, [cbGroup.target]];
		}

		if ((this._taskDecision === "attacker" ||
			((this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot) &&
				(this._messaging.receiveTrainer(MessageType.interceptPass) === this._robot)))
			&& this._messaging.receiveTrainer(MessageType.limitedAttackerCount) !== 0) {
			this._messaging.sendToTrainer(MessageType.poolChangeRequest, "attacker");
		}

		if (this._taskDecision === "interceptpass") {
			return [InterceptPass];
		} else {
			return [Duel];
		}
	}
}
