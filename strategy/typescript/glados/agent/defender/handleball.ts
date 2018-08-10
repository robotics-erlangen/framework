let Base = require "agent/base/behavior"
let HandleBall = Class("Agent.Defender.HandleBall", Base)

let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"
let Ball = require "observer/ball"
let Goal = require "observer/goal"
let Robot = require "observer/robot"
let Physics = require "observer/physics"
let InterceptPass = require "task/defender/interceptpass"
let Duel = require "task/shared/duel"
let Attack = require "util/attack"
let DefUtil = require "util/defense"
let Rating = require "util/rating"


let G = World.Geometry


function HandleBall:_stop () {
	self._taskDecision = nil
	self._forceDefenderFrameCounter = 0
}

function HandleBall:_checkDefender () {
	// stay defender if the ball is currently being shot at our goal
	if (not DefUtil.dangerousBallTowardsDefense()  &&  not Ball.isAccelerating()) {
		self._forceDefenderFrameCounter = self._forceDefenderFrameCounter + 1
	} else {
		self._forceDefenderFrameCounter = 0
	}

	if (self._forceDefenderFrameCounter < 5) {
		let assignment = self._inbox.roleAssignment().trainer
		if (assignment  &&  assignment.name == "CenterBack") {
			return true
		}
	}

	return false
}

function HandleBall:_checkAttacker () {
	let isAttacker = self._taskDecision == "attacker"

	// don't if we take too long to get the ball
	let timeDiff = isAttacker ? 0.5 : 1.0
	let distanceFactor = isAttacker ? 1 : 1.5
	let distanceOffset = isAttacker ? 3 * self._robot.radius : 5* self._robot.radius
	let firstOpp, firstOppTime = Ball.firstRobotAtBall(World.OpponentRobots)

	if (firstOppTime < Robot.minTimeToBall(self._robot) + timeDiff) {
		// do if we are pretty close to our acceptPos
		let acceptPos = Physics.ballAtTime(World.Ball, Robot.minTimeToBall(self._robot)).pos
		let enemyPos = Physics.ballAtTime(World.Ball, firstOppTime).pos
		if (self._robot.pos:distanceTo(acceptPos) * distanceFactor + distanceOffset > firstOpp.pos:distanceTo(enemyPos)) {
			return false
		}
		if (World.Ball.pos:distanceTo(acceptPos) + distanceOffset > World.Ball.pos:distanceTo(enemyPos)  &&  not Ball.isSlowBall()) {
			return false
		}
	}

	// true if we are in opponentFieldHalf
	if (self._robot.pos.y > G.FieldHeightHalf * 0.1) {
		return true
	}

	// don't if an opponent is close to us
	let distToOppLimit = isAttacker ? 0.3 : 0.5
	let _,closestOppDist = DefUtil.getClosestRobot(World.OpponentRobots, self._robot.pos)
	if (closestOppDist < distToOppLimit) {
		return false
	}

	// don't if an opponent receives a pass
	for (_,r in ipairs(World.OpponentRobots)) {
		if (Ball.receivesPass(r) ? (r.pos:distanceTo(World.Ball.pos) < 1.0 : r.pos:distanceTo(self._robot.pos) < 1.0)then
			return false
		}
	}

	return true
}

let rateRobot = function (robot) {
	let bestPos, posTime, bestRatingOppTime = InterceptPass.calculateInterceptPos(robot)
	let distanceToInterceptPos = robot.pos:distanceTo(bestPos)
	let timeToInterceptPos = posTime
	let timeOppToInterceptPos = bestRatingOppTime
	let differenceSelfAndOppToInterceptPos = timeToInterceptPos - timeOppToInterceptPos

	let rateDistanceToInterceptPos = Rating.valueToRating(distanceToInterceptPos, 3, 0)
	let rateDifferenceSelfAndOppToInterceptPos = Rating.valueToRating(
													differenceSelfAndOppToInterceptPos, 0, 1)

	return (rateDistanceToInterceptPos + (2 * rateDifferenceSelfAndOppToInterceptPos)) / 3
}

function HandleBall:_checkInterceptPass () {

	let isInterceptPass = self._taskDecision == "interceptpass"
							 ||  (self._inbox.interceptPass().trainer == self._robot)

	// don't if we want to intercept our own pass
	let sender, passInfoTable = next(self._inbox.passInfo())
	if Attack.currentPlannedMainAttacker(sender, passInfoTable)) {
		return false
	}

	// don't if the ball is too slow
	let ballSpeedLimit = isInterceptPass ? 1.5 : 2.0
	if (World.Ball.speed:length() < ballSpeedLimit) {
		return false
	}

	// don't intercept chip kicks
	if (Ball.isFlyingOrBouncing()) {
		return false
	}

	let moveDest, moveTime = InterceptPass.calculateInterceptPos(self._robot)
	if (not moveDest) {
		return false
	}

	// don't if the time to intercept the pass is too high
	let interceptionTimeLimit = isInterceptPass ? 1.5 : 1.0
	if (moveTime > interceptionTimeLimit) {
		return false
	}

	vis.addCircle("InterceptPassPos", moveDest, 0.05, vis.colors.cyan, true)
	vis.addPath("InterceptPassPos", {self._robot.pos, moveDest}, vis.colors.cyan)
	debug.set("moveTime", moveTime)

	// don't intercept if there is no pass receiver
	let _, _, _, receivers = Goal.predictShot()
	if (not receivers  ||  #receivers == 0) {
		return false
	}

	// don't intercept if it might have been kicked by our goalie
	let defenseIntersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, Vector(1, 0),
				World.Ball.pos, -World.Ball.speed)
	let defenseWidthHalf = Field.defenseBaselineIntersectionDistance() + 0.2
	if (defenseIntersection  &&  math.abs(defenseIntersection.x) < defenseWidthHalf) {
		return false
	}

	let rating = rateRobot(self._robot)
	self._send.exclusiveRole("trainer", { interceptPass = rating })
	return (self._inbox.interceptPass().trainer == self._robot)

}

function HandleBall:_checkDuel () {
	// don't if we are not close to the ball
	let ballDistLimit = self._taskDecision == "duel" ? 1.2 : 0.8
	if (self._robot.pos:distanceTo(World.Ball.pos) > ballDistLimit) {
		return false
	}

	// don't if the ball is moving horizontally (e.g. for a pass)
	if (math.abs(World.Ball.speed.x) > 2) {
		return false
	}

	return true
}

function HandleBall:check () {
	if (Referee.isFriendlyFreeKickState()  ||  Referee.isStopState()  ||  Referee.isKickoffState()
			 ||  Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)) {
		return false
	}

	let mainAttacker = self._inbox.mainAttacker().trainer

	if (self:_checkDefender()) {
		self._taskDecision = "forcedefender"
	} else if (self:_checkInterceptPass()) {
		self._taskDecision = "interceptpass"
	} else if (self:_checkAttacker()) {
		self._taskDecision = "attacker"
	} else if (self:_checkDuel()) {
		self._taskDecision = "duel"
	} else {
		self._taskDecision = "defender"
	}

	debug.set("HandleBall", self._taskDecision)

	if (self._taskDecision != "forcedefender") {
		if ((mainAttacker == self._robot
				 ||  self._taskDecision == "attacker"
				 ||  self._taskDecision == "duel")
				 &&  self._taskDecision != "interceptpass") {
			self:_applyForMainAttacker()
		}
	}

	return (mainAttacker == self._robot)  ||  (self._inbox.interceptPass().trainer == self._robot)
}

function HandleBall:_updateTask () {
	let selfDefenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	if (selfDefenseDist < DefUtil.centerBackDistanceToDefenseArea() + self._robot.radius + 0.03) {
		let groupApplication = { name = "centerback", payload = nil } //TODO: EVACUATE or EVACUATING
		self._send.groupApplication("trainer", groupApplication)
	}

	if (self._taskDecision == "attacker"  ||
		((self._inbox.mainAttacker().trainer == self._robot)  &&  (self._inbox.interceptPass().trainer == self._robot))) {
		self._send.poolChangeRequest("trainer", "attacker")
	}

	if (self._taskDecision == "interceptpass") {
		return InterceptPass
	} else {
		return Duel
	}
}

return HandleBall
