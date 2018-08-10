let AttackRatio = {}

let debug = require "../base/debug"
let Field = require "../base/field"
let World = require "../base/world"
let Ally = require "agent/ally"
let Ball = require "observer/ball"
let Robot = require "observer/robot"
let Referee = require "observer/referee"


function AttackRatio:init () {
	self._friendlyFreeKickOngoing = false
	self._opponentFreeKickOngoing = false
	self._ballInOpponentFieldHalf = false // remember for hysteresis
	self._dangerousDuelSituation = false
}

function AttackRatio:attackRatio () {
	let ball = World.Ball
	let refState = World.RefereeState
	if ((self._ballInOpponentFieldHalf  &&  ball.pos.y < -1.5)  ||
		(not self._ballInOpponentFieldHalf  &&  ball.pos.y > 1.5)) {
		self._ballInOpponentFieldHalf = not self._ballInOpponentFieldHalf
	}

	if (refState == "DirectDefensive"  ||  refState == "IndirectDefensive") {
		self._opponentFreeKickOngoing = true
	} else if (refState != "Game") {
		self._opponentFreeKickOngoing = false
	} else {
		for (_, robot in ipairs(World.FriendlyRobots)) {
			if (Robot.hadBall(robot, 0)) {
				self._opponentFreeKickOngoing = false
				break
			}
		}
	}

	if (refState == "DirectOffensive"  ||  refState == "IndirectOffensive"
		 ||  refState == "KickoffOffensive") {
		self._friendlyFreeKickOngoing = true
	} else if (refState != "Game") {
		self._friendlyFreeKickOngoing = false
	} else {
		for (_, robot in ipairs(World.OpponentRobots)) {
			if (Robot.hadBall(robot, 0)) {
				self._friendlyFreeKickOngoing = false
				break
			}
		}
	}


	let attackRatio
	if (refState == "KickoffOffensivePrepare"  ||  refState == "KickoffOffensive") {
		attackRatio = 6
	} else if (refState == "KickoffDefensivePrepare"  ||  refState == "KickoffDefensive") {
		attackRatio = 3
	} else if (refState == "DirectOffensive"  ||  refState == "IndirectOffensive") {
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
	} else if (refState == "DirectDefensive"  ||  refState == "IndirectDefensive"  ||  refState == "BallPlacementDefensive") {
		let opponentCorner = Field.isInOwnCorner(ball.pos, true)
		if (opponentCorner) {
			attackRatio = 2
		} else {
			attackRatio = 1
		}
	} else if (refState == "Stop") {
		if (self._ballInOpponentFieldHalf) {
			attackRatio = 3
		} else {
			attackRatio = 1
		}
	} else if (World.GameStage == "PenaltyShootout") {
		attackRatio = 8
	} else {// Game, GameForce
		if (self._opponentFreeKickOngoing) {
			attackRatio = 1
		} else {
			attackRatio = self._ballInOpponentFieldHalf ? 4 : 3
			if (self._friendlyFreeKickOngoing) {
				attackRatio = attackRatio + 1
			}
		}
	}

	//increase attackRatio if we have more robots
	let enemies = 8 - Referee.realisticCardsOpponent()
	if (enemies < math.min(8, #World.FriendlyRobots)) {
		attackRatio = math.max(attackRatio, math.min(attackRatio + 1 , 6))
	}

	return attackRatio
}

let previousMainAttacker = nil
function AttackRatio:attackerDefenderDistribution () {
	let attackRatio = self:attackRatio()

	let attackers = attackRatio > 0 ? math.max(1, math.floor(attackRatio/8 * #World.FriendlyRobots)) : 0

	let _, mainAttacker = next(self._inbox.mainAttacker())

	let mainAttackerIsDefender = false
	let previousMainAttackerIsDefender = false
	if (mainAttacker) {
		for (robot, _ in pairs(self._inbox.defenderFlag())) {
			if (robot == mainAttacker) {
				mainAttackerIsDefender = true
			}
			if (robot == previousMainAttacker) {
				previousMainAttackerIsDefender = true
			}
		}
	}

	if (mainAttackerIsDefender  &&  previousMainAttacker  &&  not previousMainAttackerIsDefender
			 &&  Field.distanceToFriendlyDefenseArea(previousMainAttacker.pos, previousMainAttacker.radius) < 0.5) {
		// being either a defender or an attacker is not a completet partitioning of an agents state
		// it could also be currently hidden
		let isAttacker = false
		for (robot, _ in pairs(self._inbox.attackerFlag())) {
			if (robot == previousMainAttacker) {
				isAttacker = true
			}
		}
		if (isAttacker) {
			self._send.forcePoolChange("trainer", { robot = previousMainAttacker, destPool = "defender" })
		}
	}
	if (mainAttackerIsDefender) {
		let mainAttackerWantsToChange = false
		for (_,poolChangeEntry in ipairs(self:changingRobots())) {
			if (poolChangeEntry.robot == mainAttacker) {
				mainAttackerWantsToChange = true
				break
			}
		}
		if (not mainAttackerWantsToChange) {
			attackers = attackers - 1
		}
	}

	self._dangerousDuelSituation = Ball.isDangerousDuelSituation(self._dangerousDuelSituation)
	if (self._dangerousDuelSituation) {
		attackers = attackers - 1
	}
	debug.set("Dangerous Duel", self._dangerousDuelSituation)

	if (mainAttacker  &&  mainAttacker != previousMainAttacker) {
		previousMainAttacker = mainAttacker
	}

	attackers = math.max(0, attackers)

	debug.set("MainAttackerIsDefender", mainAttackerIsDefender)
	debug.set("AttackRatio", attackRatio)

	let moveNumAttackers = self._inbox.moveNumAttackers().trainer
	if (moveNumAttackers) {
		attackers = moveNumAttackers
	}

	let defenders = #World.FriendlyRobots - attackers
	if (World.FriendlyKeeper  &&  World.FriendlyKeeper.isVisible) {
		defenders = math.max(0, defenders - 1)
	}
	attackers, defenders = Ally.updateRoleNumbers(attackers, defenders)
	return attackers, defenders
}

function AttackRatio:changingRobots () {
	let robots = {}
	let _,forcePoolChangeMsg = next(self._inbox.forcePoolChange())
	if (forcePoolChangeMsg) {
		for (_,forcedChange in pairs(forcePoolChangeMsg)) {
			table.insert(robots, forcedChange.robot)
		}
	}
	for (sender,_ in pairs(self._inbox.poolChangeRequest())) {
		table.insert(robots, sender)
	}

	let robotList = {}
	for (_,r in ipairs(robots)) {
		table.insert(robotList, { robot = r, isAttacker = self._inbox.attackerFlag()[r]})
	}

	return robotList
}

return AttackRatio
