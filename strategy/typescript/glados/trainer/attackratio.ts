import * as Constants from "base/constants";
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

export type ChangePoolTo = "attacker" | "defender";

export interface ForcePoolChange {
	robot: FriendlyRobot;
	destPool: "manual" | "ally" | "keeper" | "defender" | "attacker" | "hidden";
}

export enum AttackRatioKind {
	Scalable = "scalable",
	ConstantAttackers = "constant attackers",
	ConstantDefenders = "constant defenders",
}


// attack ratio is currently defined as x out of 10 robots, because it is defined as the currently available number of robots in Division A
// that can be attacker/defender, so 11 - 1, because the keeper can't fill those roles
type ValidAttackRatio = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type AttackRatioResult = {
	kind: AttackRatioKind.Scalable;
	ratio: ValidAttackRatio;
} | {
	kind: AttackRatioKind.ConstantAttackers;
	numberOfAttackers: ValidAttackRatio;
} | {
	kind: AttackRatioKind.ConstantDefenders;
	numberOfDefenders: ValidAttackRatio;
};

export class AttackRatio {
	_friendlyFreeKickOngoing: boolean = false;
	_opponentFreeKickAT: AttackRatioResult | undefined = undefined;
	_ballInOpponentFieldHalf: boolean = false; // remember for hysteresis
	_dangerousDuelSituation: boolean = false;
	_previousMainAttacker: FriendlyRobot | undefined;

	_messaging: MessageBox;

	constructor(messaging: MessageBox) {
		this._messaging = messaging;
	}

	attackRatio(): AttackRatioResult {
		let ball = World.Ball;
		let refState = World.RefereeState;
		let nextRefState = World.NextRefereeState;
		if ((this._ballInOpponentFieldHalf && ball.pos.y < -1.5) ||
			(!this._ballInOpponentFieldHalf && ball.pos.y > 1.5)) {
			this._ballInOpponentFieldHalf = !this._ballInOpponentFieldHalf;
		}

		if (BaseRef.isOpponentFreeKickState(refState)) {
			this._opponentFreeKickAT = {
				kind: AttackRatioKind.ConstantAttackers,
				numberOfAttackers: 0,
			};
		} else if (refState !== "Game") {
			this._opponentFreeKickAT = undefined;
		} else {
			for (let robot of World.FriendlyRobots) {
				if (Robot.hadBall(robot, 0)) {
					this._opponentFreeKickAT = undefined;
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


		let result: AttackRatioResult;

		if (BaseRef.isFriendlyKickoffState(refState)) {
			result = {
				kind: AttackRatioKind.ConstantDefenders,
				numberOfDefenders: 2,
			};
		} else if (BaseRef.isOpponentKickoffState(refState)) {
			result = {
				kind: AttackRatioKind.Scalable,
				ratio: 4,
			};
		} else if (BaseRef.isFriendlyFreeKickState(refState)
				|| (refState === "BallPlacementOffensive" && BaseRef.isFriendlyFreeKickState(nextRefState))) {
			let checkedPos = refState === "BallPlacementOffensive"
				? World.BallPlacementPos!
				: ball.pos;
			let friendlyCorner = Field.isInOwnCorner(checkedPos, false);
			let opponentCorner = Field.isInOwnCorner(checkedPos, true);
			let attackRatio: ValidAttackRatio;
			if (friendlyCorner) { // Goal-Kick Offensive
				attackRatio = 5;
			} else if (opponentCorner) { // Corner-Kick Offensive
				attackRatio = 9;
			} else if (checkedPos.y > 1.2) {
				attackRatio = 8; // Throw-In Offensive
			// eslint-disable-next-line sonarjs/no-duplicated-branches
			} else {
				attackRatio = 5; // Throw-In Offensive
			}
			result = {
				kind: AttackRatioKind.Scalable,
				ratio: attackRatio,
			};
		} else if (BaseRef.isOpponentFreeKickState(refState) || refState === "BallPlacementDefensive") {
			let opponentCorner = Field.isInOwnCorner(ball.pos, true);
			if (opponentCorner) {
				result = {
					kind: AttackRatioKind.ConstantAttackers,
					numberOfAttackers: 2,
				};
			} else {
				result = {
					kind: AttackRatioKind.ConstantAttackers,
					numberOfAttackers: 1,
				};
			}
			if (this._opponentFreeKickAT != undefined) {
				this._opponentFreeKickAT = result;
			}
		} else if (refState === "Stop") {
			if (this._ballInOpponentFieldHalf) {
				result = {
					kind: AttackRatioKind.Scalable,
					ratio: 4,
				};
			} else {
				result = {
					kind: AttackRatioKind.ConstantAttackers,
					numberOfAttackers: 1,
				};
			}
		} else { // Game, GameForce
			if (this._opponentFreeKickAT != undefined) {
				result = this._opponentFreeKickAT;
			} else {
				let attackRatio = this._ballInOpponentFieldHalf ? 5 : 4;
				if (this._friendlyFreeKickOngoing) {
					attackRatio = attackRatio + 1;
				}

				if (attackRatio >= 0 && attackRatio <= 10) {
					result = {
						kind: AttackRatioKind.Scalable,
						ratio: <ValidAttackRatio> attackRatio,
					};
				} else {
					throw new Error(`Invalid attackRatio ${attackRatio}! Needs to be between 0 and 10 (inclusive)`);
				}
			}
		}

		const expectedEnemies = Constants.maxTeamSize[World.DIVISION];
		// increase attackRatio if we have more robots
		let enemies = expectedEnemies - Referee.realisticCardsOpponent();
		if (result.kind === AttackRatioKind.Scalable && enemies < Math.min(expectedEnemies, World.FriendlyRobots.length)) {
			// type assertion here should be fine, since it can't be greater than 10 and this expression can't make values >= 0 negative
			result.ratio = <ValidAttackRatio> Math.min(10, Math.max(result.ratio, Math.min(result.ratio + 1, 2.0 / 3 * expectedEnemies)));
		}

		return result;
	}

	attackerDefenderDistribution(): [number, number] {

		if (World.FriendlyRobots.length === 0) {
			return [0, 0];
		}

		let attackRatio = this.attackRatio();

		const robotCountWithoutKeeper = Math.max(0, World.FriendlyRobots.length - 1);
		let attackers: number;
		switch (attackRatio.kind) {
			case AttackRatioKind.ConstantAttackers: {
				attackers = Math.min(robotCountWithoutKeeper, attackRatio.numberOfAttackers);
				// this is only necessary here, because if you're using ConstantDefenders to say 9 defenders you're doing something wrong
				// and in the scalable case we allow additional attackers
				if (attackRatio.numberOfAttackers === 1) {
					this._messaging.sendBroadcast(MessageType.onlySingleAttacker);
				}
				break;
			};
			case AttackRatioKind.ConstantDefenders: {
				attackers = Math.max(0, robotCountWithoutKeeper - attackRatio.numberOfDefenders);
				break;
			};
			case AttackRatioKind.Scalable: {
				// we always compute attackRatio with the maximum allowed robots in DivA in mind and scale it to the actual number of robots
				// this should also work if we play DivB
				// the keeper is neither defender nor attacker so we need to subtract 1
				// this makes the attack ratio also more intuitive in Div A with 11 robots, because then ratio = 9 means 9/10 robots should be attacker
				const maxRobotsWithoutKeeper = Constants.maxTeamSize["A"] - 1;
				attackers = Math.max(1, Math.floor(attackRatio.ratio / maxRobotsWithoutKeeper * robotCountWithoutKeeper));

				// allow a defender to promote if a pass is ongoing.
				// The increased attacker count will result in one defender promoting.
				// a/defender adjust its rating to "I'm a bad defender" if receiving a pass,
				// so the correct robot will be promoted.
				let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
				if (passInfoTable && attackers < 2) {
					attackers = 2;
				}
				break;
			};
		}

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
				&& Field.distanceToFriendlyDefenseArea(this._previousMainAttacker.pos, this._previousMainAttacker.radius) < 0.5) {
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
			const num = moveInfo.attackers.length;
			attackers = moveInfo.allowExtraAttackers ? Math.max(attackers, num) : num;
		}

		let defenders = World.FriendlyRobots.length - attackers;
		if (World.FriendlyKeeper && World.FriendlyKeeper.isVisible) {
			defenders = defenders - 1;
		}
		// Math.max(0, defenders) should only be necessary in the if above,
		// but has to happen after the if, because the following scenario being
		// possible due to messaging delay:
		// - the keeper is not visible, so the above if is not entered
		// - a move with MIN_ROBOTS = 2 activates, because we have 2 FriendlyRobots
		// 	 and sends MessageType.moveInfo with moveInfo.attackers === 2.
		// - In the next frame one of the robots drops out of the vision and vanishes
		// - This means World.FriendlyRobots.length === 1, but we receive moveInfo.attackers === 2
		//   from the last frame, which results in the weird case of having negative defenders.
		// The move dies in the same frame, because it does not have enough robots anymore,
		// meaning this should not cause any noticable logical problems, but it would cause
		// a crash without clamping the defenders to 0.
		defenders = Math.max(0, defenders);
		// [attackers, defenders] = Ally.updateRoleNumbers(attackers, defenders);
		return [attackers, defenders];
	}

	changingRobots(): { robot: FriendlyRobot; isAttacker: boolean }[] {
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
			robotList.push({ robot: r, isAttacker: this._messaging.receive(MessageType.attackerFlag).has(r) });
		}

		return robotList;
	}
}
