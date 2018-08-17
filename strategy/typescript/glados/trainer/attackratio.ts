let AttackRatio = {}

import * as debug from "base/debug";
import * as Field from "base/field";
import * as World from "base/world";
let Ally = require "agent/ally"
import * as Ball from "glados/tobserver/ball";
import * as Robot from "glados/observer/robot";
import * as Referee from "glados/observer/referee";


function AttackRatio:init () {
	this._friendlyFreeKickOngoing = false
	this._opponentFreeKickOngoing = false
	this._ballInOpponentFieldHalf = false // remember for hysteresis
	this._dangerousDuelSituation = false
}

function AttackRatio:attackRatio () {
	let ball = World.Ball
	let refState = World.RefereeState
	if ((this._ballInOpponentFieldHalf && ball.pos.y < -1.5)  ||
		(not this._ballInOpponentFieldHalf && ball.pos.y > 1.5)) {
		this._ballInOpponentFieldHalf = not this._ballInOpponentFieldHalf
	}

	if (refState == "DirectDefensive" || refState == "IndirectDefensive") {
		this._opponentFreeKickOngoing = true
	} else if (refState != "Game") {
		this._opponentFreeKickOngoing = false
	} else {
		for (let robot of World.FriendlyRobots) {
			if (Robot.hadBall(robot, 0)) {
				this._opponentFreeKickOngoing = false
				break
			}
		}
	}

	if (refState == "DirectOffensive" || refState == "IndirectOffensive"
		 ||  refState == "KickoffOffensive") {
		this._friendlyFreeKickOngoing = true
	} else if (refState != "Game") {
		this._friendlyFreeKickOngoing = false
	} else {
		for (let robot of World.OpponentRobots) {
			if (Robot.hadBall(robot, 0)) {
				this._friendlyFreeKickOngoing = false
				break
			}
		}
	}


	let attackRatio
	if (refState == "KickoffOffensivePrepare" || refState == "KickoffOffensive") {
		attackRatio = 6
	} else if (refState == "KickoffDefensivePrepare" || refState == "KickoffDefensive") {
		attackRatio = 3
	} else if (refState == "DirectOffensive" || refState == "IndirectOffensive") {
		let friendlyCorner = Field.isInOwnCorner(ball.pos, false)
		let opponentCorner = Field.isInOwnCorner(ball.pos, true)
		if (friendlyCorner) { // Goal-Kick Offensive
			attackRatio = 4
		} else if (opponentCorner) { // Corner-Kick Offensive
			attackRatio = 7
		} else if (ball.pos.y > 1.2) {
			attackRatio = 6 // Throw-In Offensive
		} else {
			attackRatio = 4 // Throw-In Offensive
		}
	} else if (refState == "DirectDefensive" || refState == "IndirectDefensive" || refState == "BallPlacementDefensive") {
		let opponentCorner = Field.isInOwnCorner(ball.pos, true)
		if (opponentCorner) {
			attackRatio = 2
		} else {
			attackRatio = 1
		}
	} else if (refState == "Stop") {
		if (this._ballInOpponentFieldHalf) {
			attackRatio = 3
		} else {
			attackRatio = 1
		}
	} else if (World.GameStage == "PenaltyShootout") {
		attackRatio = 8
	} else {// Game, GameForce
		if (this._opponentFreeKickOngoing) {
			attackRatio = 1
		} else {
			attackRatio = this._ballInOpponentFieldHalf ? 4 : 3
			if (this._friendlyFreeKickOngoing) {
				attackRatio = attackRatio + 1
			}
		}
	}

	//increase attackRatio if we have more robots
	let enemies = 8 - Referee.realisticCardsOpponent()
	if (enemies < Math.min(8, World.FriendlyRobots.length)) {
		attackRatio = Math.max(attackRatio, Math.min(attackRatio + 1 , 6))
	}

	return attackRatio
}

let previousMainAttacker = nil
function AttackRatio:attackerDefenderDistribution () {
	let attackRatio = this.attackRatio()

	let attackers = attackRatio > 0 ? Math.max(1, Math.floor(attackRatio/8 * World.FriendlyRobots.length)) : 0

	let _, mainAttacker = next(this._inbox.mainAttacker())

	let mainAttackerIsDefender = false
	let previousMainAttackerIsDefender = false
	if (mainAttacker) {
		for (robot, _ in pairs(this._inbox.defenderFlag())) {
			if (robot == mainAttacker) {
				mainAttackerIsDefender = true
			}
			if (robot == previousMainAttacker) {
				previousMainAttackerIsDefender = true
			}
		}
	}

	if (mainAttackerIsDefender && previousMainAttacker && not previousMainAttackerIsDefender
			 &&  Field.distanceToFriendlyDefenseArea(previousMainAttacker.pos, previousMainAttacker.radius) < 0.5) {
		// being either a defender or an attacker is not a completet partitioning of an agents state
		// it could also be currently hidden
		let isAttacker = false
		for (robot, _ in pairs(this._inbox.attackerFlag())) {
			if (robot == previousMainAttacker) {
				isAttacker = true
			}
		}
		if (isAttacker) {
			this._send.forcePoolChange("trainer", { robot = previousMainAttacker, destPool = "defender" })
		}
	}
	if (mainAttackerIsDefender) {
		let mainAttackerWantsToChange = false
		for (_,poolChangeEntry in ipairs(this.changingRobots())) {
			if (poolChangeEntry.robot == mainAttacker) {
				mainAttackerWantsToChange = true
				break
			}
		}
		if (not mainAttackerWantsToChange) {
			attackers = attackers - 1
		}
	}

	this._dangerousDuelSituation = Ball.isDangerousDuelSituation(this._dangerousDuelSituation)
	if (this._dangerousDuelSituation) {
		attackers = attackers - 1
	}
	debug.set("Dangerous Duel", this._dangerousDuelSituation)

	if (mainAttacker && mainAttacker != previousMainAttacker) {
		previousMainAttacker = mainAttacker
	}

	attackers = Math.max(0, attackers)

	debug.set("MainAttackerIsDefender", mainAttackerIsDefender)
	debug.set("AttackRatio", attackRatio)

	let moveNumAttackers = this._inbox.moveNumAttackers().trainer
	if (moveNumAttackers) {
		attackers = moveNumAttackers
	}

	let defenders = World.FriendlyRobots.length - attackers
	if (World.FriendlyKeeper && World.FriendlyKeeper.isVisible) {
		defenders = Math.max(0, defenders - 1)
	}
	attackers, defenders = Ally.updateRoleNumbers(attackers, defenders)
	return attackers, defenders
}

function AttackRatio:changingRobots () {
	let robots = {}
	let _,forcePoolChangeMsg = next(this._inbox.forcePoolChange())
	if (forcePoolChangeMsg) {
		for (_,forcedChange in pairs(forcePoolChangeMsg)) {
			table.insert(robots, forcedChange.robot)
		}
	}
	for (sender,_ in pairs(this._inbox.poolChangeRequest())) {
		table.insert(robots, sender)
	}

	let robotList = {}
	for (_,r in ipairs(robots)) {
		table.insert(robotList, { robot = r, isAttacker = this._inbox.attackerFlag()[r]})
	}

	return robotList
}

return AttackRatio
