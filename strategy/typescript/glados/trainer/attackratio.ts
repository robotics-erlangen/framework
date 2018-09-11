import * as debug from "base/debug";
import * as Field from "base/field";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";
//
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
		if ((this._ballInOpponentFieldHalf && ball.pos.y < -1.5)  ||
			(!this._ballInOpponentFieldHalf && ball.pos.y > 1.5)) {
			this._ballInOpponentFieldHalf = !this._ballInOpponentFieldHalf;
		}

		if (refState === "DirectDefensive" || refState === "IndirectDefensive") {
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

		if (refState === "DirectOffensive" || refState === "IndirectOffensive"
			||  refState === "KickoffOffensive") {
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


		let attackRatio;
		if (refState === "KickoffOffensivePrepare" || refState === "KickoffOffensive") {
			attackRatio = 6;
		} else if (refState === "KickoffDefensivePrepare" || refState === "KickoffDefensive") {
			attackRatio = 3;
		} else if (refState === "DirectOffensive" || refState === "IndirectOffensive") {
			let friendlyCorner = Field.isInOwnCorner(ball.pos, false);
			let opponentCorner = Field.isInOwnCorner(ball.pos, true);
			if (friendlyCorner) { // Goal-Kick Offensive
				attackRatio = 4;
			} else if (opponentCorner) { // Corner-Kick Offensive
				attackRatio = 7;
			} else if (ball.pos.y > 1.2) {
				attackRatio = 6; // Throw-In Offensive
			} else {
				attackRatio = 4; // Throw-In Offensive
			}
		} else if (refState === "DirectDefensive" || refState === "IndirectDefensive" || refState === "BallPlacementDefensive") {
			let opponentCorner = Field.isInOwnCorner(ball.pos, true);
			if (opponentCorner) {
				attackRatio = 2;
			} else {
				attackRatio = 1;
			}
		} else if (refState === "Stop") {
			if (this._ballInOpponentFieldHalf) {
				attackRatio = 3;
			} else {
				attackRatio = 1;
			}
		} else if (World.GameStage === "PenaltyShootout") {
			attackRatio = 8;
		} else {// Game, GameForce
			if (this._opponentFreeKickOngoing) {
				attackRatio = 1;
			} else {
				attackRatio = this._ballInOpponentFieldHalf ? 4 : 3;
				if (this._friendlyFreeKickOngoing) {
					attackRatio = attackRatio + 1;
				}
			}
		}

		// increase attackRatio if we have more robots
		let enemies = 8 - Referee.realisticCardsOpponent();
		if (enemies < Math.min(8, World.FriendlyRobots.length)) {
			attackRatio = Math.max(attackRatio, Math.min(attackRatio + 1 , 6));
		}

		return attackRatio;
	}

	attackerDefenderDistribution(): [number, number] {
		let attackRatio = this.attackRatio();

		let attackers = attackRatio > 0 ? Math.max(1, Math.floor(attackRatio / 8 * World.FriendlyRobots.length)) : 0;

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

		let moveNumAttackers = this._messaging.receiveTrainer(MessageType.moveNumAttackers);
		if (moveNumAttackers) {
			attackers = moveNumAttackers;
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
