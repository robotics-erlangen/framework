import {Behavior} from "glados/agent/base/behavior";
let HandleBall = Class("Agent.Defender.HandleBall", Base)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import * as vis from "base/vis";
import * as World from "base/world";
import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Robot from "glados/observer/robot";
import * as Physics from "glados/observer/physics";
let InterceptPass = require "task/defender/interceptpass"
import {Duel} from "glados/task/shared/duel";
import * as Attack from "glados/util/attack";
let DefUtil = require "util/defense"
import * as Rating from "glados/util/rating";


let G = World.Geometry


function HandleBall:_stop () {
	this._taskDecision = nil
	this._forceDefenderFrameCounter = 0
}

function HandleBall:_checkDefender () {
	// stay defender if the ball is currently being shot at our goal
	if (not DefUtil.dangerousBallTowardsDefense() && not Ball.isAccelerating()) {
		this._forceDefenderFrameCounter = this._forceDefenderFrameCounter + 1
	} else {
		this._forceDefenderFrameCounter = 0
	}

	if (this._forceDefenderFrameCounter < 5) {
		let assignment = this._inbox.roleAssignment().trainer
		if (assignment && assignment.name == "CenterBack") {
			return true
		}
	}

	return false
}

function HandleBall:_checkAttacker () {
	let isAttacker = this._taskDecision == "attacker"

	// don't if we take too long to get the ball
	let timeDiff = isAttacker ? 0.5 : 1.0
	let distanceFactor = isAttacker ? 1 : 1.5
	let distanceOffset = isAttacker ? 3 * this._robot.radius : 5* this._robot.radius
	let firstOpp, firstOppTime = Ball.firstRobotAtBall(World.OpponentRobots)

	if (firstOppTime < Robot.minTimeToBall(this._robot) + timeDiff) {
		// do if we are pretty close to our acceptPos
		let acceptPos = Physics.ballAtTime(World.Ball, Robot.minTimeToBall(this._robot)).pos
		let enemyPos = Physics.ballAtTime(World.Ball, firstOppTime).pos
		if (this._robot.pos.distanceTo(acceptPos) * distanceFactor + distanceOffset > firstOpp.pos.distanceTo(enemyPos)) {
			return false
		}
		if (World.Ball.pos.distanceTo(acceptPos) + distanceOffset > World.Ball.pos.distanceTo(enemyPos) && not Ball.isSlowBall()) {
			return false
		}
	}

	// true if we are in opponentFieldHalf
	if (this._robot.pos.y > G.FieldHeightHalf * 0.1) {
		return true
	}

	// don't if an opponent is close to us
	let distToOppLimit = isAttacker ? 0.3 : 0.5
	let _,closestOppDist = DefUtil.getClosestRobot(World.OpponentRobots, this._robot.pos)
	if (closestOppDist < distToOppLimit) {
		return false
	}

	// don't if an opponent receives a pass
	for (_,r in ipairs(World.OpponentRobots)) {
		if (Ball.receivesPass(r) ? (r.pos.distanceTo(World.Ball.pos) < 1.0 : r.pos.distanceTo(this._robot.pos) < 1.0)then
			return false
		}
	}

	return true
}

let rateRobot = function (robot) {
	let bestPos, posTime, bestRatingOppTime = InterceptPass.calculateInterceptPos(robot)
	let distanceToInterceptPos = robot.pos.distanceTo(bestPos)
	let timeToInterceptPos = posTime
	let timeOppToInterceptPos = bestRatingOppTime
	let differenceSelfAndOppToInterceptPos = timeToInterceptPos - timeOppToInterceptPos

	let rateDistanceToInterceptPos = Rating.valueToRating(distanceToInterceptPos, 3, 0)
	let rateDifferenceSelfAndOppToInterceptPos = Rating.valueToRating(
													differenceSelfAndOppToInterceptPos, 0, 1)

	return (rateDistanceToInterceptPos + (2 * rateDifferenceSelfAndOppToInterceptPos)) / 3
}

function HandleBall:_checkInterceptPass () {

	let isInterceptPass = this._taskDecision == "interceptpass"
							 ||  (this._inbox.interceptPass().trainer == this._robot)

	// don't if we want to intercept our own pass
	let sender, passInfoTable = next(this._inbox.passInfo())
	if Attack.currentPlannedMainAttacker(sender, passInfoTable)) {
		return false
	}

	// don't if the ball is too slow
	let ballSpeedLimit = isInterceptPass ? 1.5 : 2.0
	if (World.Ball.speed.length() < ballSpeedLimit) {
		return false
	}

	// don't intercept chip kicks
	if (Ball.isFlyingOrBouncing()) {
		return false
	}

	let moveDest, moveTime = InterceptPass.calculateInterceptPos(this._robot)
	if (not moveDest) {
		return false
	}

	// don't if the time to intercept the pass is too high
	let interceptionTimeLimit = isInterceptPass ? 1.5 : 1.0
	if (moveTime > interceptionTimeLimit) {
		return false
	}

	vis.addCircle("InterceptPassPos", moveDest, 0.05, vis.colors.cyan, true)
	vis.addPath("InterceptPassPos", {this._robot.pos, moveDest}, vis.colors.cyan)
	debug.set("moveTime", moveTime)

	// don't intercept if there is no pass receiver
	let _, _, _, receivers = Goal.predictShot()
	if (not receivers || #receivers == 0) {
		return false
	}

	// don't intercept if it might have been kicked by our goalie
	let defenseIntersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, new Vector(1, 0),
				World.Ball.pos, -World.Ball.speed)
	let defenseWidthHalf = Field.defenseBaselineIntersectionDistance() + 0.2
	if (defenseIntersection && Math.abs(defenseIntersection.x) < defenseWidthHalf) {
		return false
	}

	let rating = rateRobot(this._robot)
	this._send.exclusiveRole("trainer", { interceptPass = rating })
	return (this._inbox.interceptPass().trainer == this._robot)

}

function HandleBall:_checkDuel () {
	// don't if we are not close to the ball
	let ballDistLimit = this._taskDecision == "duel" ? 1.2 : 0.8
	if (this._robot.pos.distanceTo(World.Ball.pos) > ballDistLimit) {
		return false
	}

	// don't if the ball is moving horizontally (e.g. for a pass)
	if (Math.abs(World.Ball.speed.x) > 2) {
		return false
	}

	return true
}

function HandleBall:check () {
	if (Referee.isFriendlyFreeKickState() || Referee.isStopState() || Referee.isKickoffState()
			 ||  Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)) {
		return false
	}

	let mainAttacker = this._inbox.mainAttacker().trainer

	if (this._checkDefender()) {
		this._taskDecision = "forcedefender"
	} else if (this._checkInterceptPass()) {
		this._taskDecision = "interceptpass"
	} else if (this._checkAttacker()) {
		this._taskDecision = "attacker"
	} else if (this._checkDuel()) {
		this._taskDecision = "duel"
	} else {
		this._taskDecision = "defender"
	}

	debug.set("HandleBall", this._taskDecision)

	if (this._taskDecision != "forcedefender") {
		if ((mainAttacker == this._robot
				 ||  this._taskDecision == "attacker"
				 ||  this._taskDecision == "duel")
				 &&  this._taskDecision != "interceptpass") {
			this._applyForMainAttacker()
		}
	}

	return (mainAttacker == this._robot) || (this._inbox.interceptPass().trainer == this._robot)
}

function HandleBall:_updateTask () {
	let selfDefenseDist = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
	if (selfDefenseDist < DefUtil.centerBackDistanceToDefenseArea() + this._robot.radius + 0.03) {
		let groupApplication = { name = "centerback", payload = undefined } //TODO: EVACUATE or EVACUATING
		this._send.groupApplication("trainer", groupApplication)
	}

	if (this._taskDecision == "attacker"  ||
		((this._inbox.mainAttacker().trainer == this._robot) && (this._inbox.interceptPass().trainer == this._robot))) {
		this._send.poolChangeRequest("trainer", "attacker")
	}

	if (this._taskDecision == "interceptpass") {
		return InterceptPass
	} else {
		return Duel
	}
}

return HandleBall
