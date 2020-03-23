import * as debug from "base/debug";
import * as Field from "base/field";
import * as BaseRef from "base/referee";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

// import {Ally} from "glados/agent/ally";
import { MessageBox, MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Referee from "glados/observer/referee";
import * as Robot from "glados/observer/robot";

export class AttackRatio {
	_friendlyFreeKickOngoing: boolean = false;
	_opponentFreeKickOngoing: boolean = false;
	_ballInOpponentFieldHalf: boolean = false; // remember for hysteresis
	_dangerousDuelSituation: boolean = false;
	_previousMainAttacker: FriendlyRobot | undefined;

	_messaging: MessageBox;

	constructor(messaging: MessageBox) {
		this._messaging = messaging;
	}

	attackRatio() {
		let ball = World.Ball;
		let refState = World.RefereeState;
		let nextRefState = World.NextRefereeState;
		if ((this._ballInOpponentFieldHalf && ball.pos.y < -1.5)  ||
			(!this._ballInOpponentFieldHalf && ball.pos.y > 1.5)) {
			this._ballInOpponentFieldHalf = !this._ballInOpponentFieldHalf;
		}

		if (BaseRef.isOpponentFreeKickState(refState)) {
			this._opponentFreeKickOngoing = true;
		} else if (refState !== "Game") {
			this._opponentFreeKickOngoing = false;
		} else {
			for (let robot of World.FriendlyRobots) {
				if (Robot.hadBall(robot, 0)) {
					this._opponentFreeKickOngoing = false;
					break;
				}
			}
		}

		if (BaseRef.isFriendlyFreeKickState(refState) || refState === "KickoffOffensive") {
			this._friendlyFreeKickOngoing = true;
		} else if (refState !== "Game") {
			this._friendlyFreeKickOngoing = false;
		} else {
			for (let robot of World.OpponentRobots) {
				if (Robot.hadBall(robot, 0)) {
					this._friendlyFreeKickOngoing = false;
					break;
				}
			}
		}


		let attackRatio: number;

		if (BaseRef.isFriendlyPenaltyState() || BaseRef.isOpponentPenaltyState()) {
			attackRatio = 11;
		} else if (BaseRef.isFriendlyKickoffState(refState)) {
			attackRatio = 8;
		} else if (BaseRef.isOpponentFreeKickState(refState)) {
			attackRatio = 4;
		} else if (BaseRef.isFriendlyFreeKickState(refState)
				|| (refState === "BallPlacementOffensive" && BaseRef.isFriendlyFreeKickState(nextRefState))) {
			let checkedPos = refState === "BallPlacementOffensive"
				? World.BallPlacementPos!
				: ball.pos;
			let friendlyCorner = Field.isInOwnCorner(checkedPos, false);
			let opponentCorner = Field.isInOwnCorner(checkedPos, true);
			if (friendlyCorner) { // Goal-Kick Offensive
				attackRatio = 5;
			} else if (opponentCorner) { // Corner-Kick Offensive
				attackRatio = 9;
			} else if (checkedPos.y > 1.2) {
				attackRatio = 8; // Throw-In Offensive
			} else {
				attackRatio = 5; // Throw-In Offensive
			}
		} else if (BaseRef.isOpponentFreeKickState(refState) || refState === "BallPlacementDefensive") {
			let opponentCorner = Field.isInOwnCorner(ball.pos, true);
			if (opponentCorner) {
				attackRatio = 2;
			} else {
				attackRatio = 1;
			}
		} else if (BaseRef.isOpponentPenaltyState(refState)) {
			attackRatio = 1;
		} else if (BaseRef.isFriendlyPenaltyState(refState)) {
			attackRatio = 10;
		} else if (refState === "Stop") {
			if (this._ballInOpponentFieldHalf) {
				attackRatio = 4;
			} else {
				attackRatio = 1;
			}
		} else {// Game, GameForce
			if (this._opponentFreeKickOngoing) {
				attackRatio = 1;
			} else {
				attackRatio = this._ballInOpponentFieldHalf ? 5 : 4;
				if (this._friendlyFreeKickOngoing) {
					attackRatio = attackRatio + 1;
				}
			}
		}

		// increase attackRatio if we have more robots
		let enemies = 11 - Referee.realisticCardsOpponent();
		if (enemies < Math.min(11, World.FriendlyRobots.length)) {
			attackRatio = Math.max(attackRatio, Math.min(attackRatio + 1 , 8));
		}

		// allow a defender to promote if a pass is ongoing.
		// The increased attackRatio will result in one defender promoting.
		// a/defender adjust its rating to "I'm a bad defender" if recieving a pass,
		// so the correct robot will be promoted.
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable && attackRatio < 2) {
			attackRatio = 2;
		}
		return attackRatio;
	}

	attackerDefenderDistribution(): [number, number] {
		let attackRatio = this.attackRatio();

		let attackers = attackRatio > 0 ? Math.max(1, Math.floor(attackRatio / 11 * World.FriendlyRobots.length)) : 0;

		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);

		let mainAttackerIsDefender = false;
		let previousMainAttackerIsDefender = false;
		if (mainAttacker) {
			for (let robot of this._messaging.receive(MessageType.defenderFlag).keys()) {
				if (robot === mainAttacker) {
					mainAttackerIsDefender = true;
				}
				if (robot === this._previousMainAttacker) {
					previousMainAttackerIsDefender = true;
				}
			}
		}

		if (mainAttackerIsDefender && this._previousMainAttacker && !previousMainAttackerIsDefender
				&&  Field.distanceToFriendlyDefenseArea(this._previousMainAttacker.pos, this._previousMainAttacker.radius) < 0.5) {
			// being either a defender or an attacker is not a completet partitioning of an agents state
			// it could also be currently hidden
			let isAttacker = false;
			for (let robot of this._messaging.receive(MessageType.attackerFlag).keys()) {
				if (robot === this._previousMainAttacker) {
					isAttacker = true;
				}
			}
			if (isAttacker) {
				this._messaging.sendToTrainerRepeated(MessageType.forcePoolChange, { robot: this._previousMainAttacker, destPool: "defender" });
			}
		}
		if (mainAttackerIsDefender) {
			let mainAttackerWantsToChange = false;
			for (let poolChangeEntry of this.changingRobots()) {
				if (poolChangeEntry.robot === mainAttacker) {
					mainAttackerWantsToChange = true;
					break;
				}
			}
			if (!mainAttackerWantsToChange) {
				attackers = attackers - 1;
			}
		}

		this._dangerousDuelSituation = Ball.isDangerousDuelSituation(this._dangerousDuelSituation);
		if (this._dangerousDuelSituation) {
			attackers = attackers - 1;
		}
		debug.set("Dangerous Duel", this._dangerousDuelSituation);

		if (mainAttacker && mainAttacker !== this._previousMainAttacker) {
			this._previousMainAttacker = mainAttacker;
		}

		attackers = Math.max(0, attackers);

		debug.set("MainAttackerIsDefender", mainAttackerIsDefender);
		debug.set("AttackRatio", attackRatio);

		let moveInfo = this._messaging.receiveTrainer(MessageType.moveInfo);
		if (moveInfo) {
			const num = moveInfo.numAttackers;
			attackers = moveInfo.allowExtraAttackers ? Math.max(attackers, num) : num;
		}

		let defenders = World.FriendlyRobots.length - attackers;
		if (World.FriendlyKeeper && World.FriendlyKeeper.isVisible) {
			defenders = Math.max(0, defenders - 1);
		}
		// [attackers, defenders] = Ally.updateRoleNumbers(attackers, defenders);
		return [attackers, defenders];
	}

	changingRobots(): {robot: FriendlyRobot, isAttacker: boolean}[] {
		let robots = [];
		let forcePoolChangeMsg = this._messaging.receiveTrainerRepeated(MessageType.forcePoolChange);
		if (forcePoolChangeMsg) {
			for (let forcedChange of forcePoolChangeMsg) {
				robots.push(forcedChange.robot);
				const robotIsAttacker = this._messaging.receive(MessageType.attackerFlag).has(forcedChange.robot);
				if (robotIsAttacker && forcedChange.destPool === "attacker" ||
					!robotIsAttacker && forcedChange.destPool === "defender") {
						throw new Error("Invalid forcePoolChange message");
				}
			}
		}
		for (let sender of this._messaging.receive(MessageType.poolChangeRequest).keys()) {
			robots.push(sender);
		}

		let robotList = [];
		for (let r of robots) {
			robotList.push({ robot: r, isAttacker: this._messaging.receive(MessageType.attackerFlag).has(r)});
		}

		return robotList;
	}
}
