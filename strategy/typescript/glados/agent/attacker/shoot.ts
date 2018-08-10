let Base = require "agent/base/behavior"
let Shoot = Class("Agent.Attacker.Shoot", Base)

let debug = require "../base/debug"
let Field = require "../base/field"
let vis = require "../base/vis"
let World = require "../base/world"

let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let ObserverShoot = require "observer/shoot"

let ChipToPos = require "task/shared/chipToPos"
let Pass = require "task/shared/pass"
let ShootGoal = require "task/attacker/shootgoal"

let Attack = require "util/attack"
let ShootGoalUtil = require "util/shootgoal"

let G = World.Geometry

let ENABLE_PSEUDO_PASS = true


function Shoot:_stop () {
	self._nextDecisionTime = World.Time
	self._decision = { task = "none" }

	self._prevPassPos = nil

	self._attackPosition = nil
	self._prevAttackPosition = nil

	self._activeFrames = 0

	self._lastIncomingPassInfoPos = nil

	self._hadBallCounter = 0
	self._touchedBall = false

	self._wasPressed = false

	self._manualFlag = false
}

function Shoot:check () {
	return self._inbox.mainAttacker().trainer == self._robot
}

function Shoot:_shootGoalPossible (robot, attackPosition) {
	let sg_target, angle, sg_dirty = ShootGoalUtil.updateTarget(robot, nil, false, attackPosition)

	if (sg_dirty) {
		return false, angle
	}

	if (World.Ball.speed:length() > 1.2) {
		return ObserverShoot.volleyPossible(robot, sg_target)
	}

	if (attackPosition  &&  Field.distanceToOpponentDefenseArea(attackPosition, 0) > 1  &&  Robot.isPressed(robot, attackPosition)) {
		return false, angle
	}

	return true, angle
}

function Shoot:_checkForManualAlly () {
	self._manualFlag = false
	for (sender, passSuggestion in pairs(self._inbox.passSuggestion())) {
		if (passSuggestion.manual) {
			self._manualFlag = true
			self._decision = {
				task = "pass",
				target = sender,
				pos = passSuggestion.ballPos,
				time = passSuggestion.time,
				quality = "clean"
			}
		}
	}
}

let MIN_PASS_RATING = 0.3
function Shoot:_decide () {
	self._wasPressed = Robot.isPressed(self._robot)

	// perform clean goal shots if possible
	if (self:_shootGoalPossible(self._robot, self._attackPosition)) {
		return {
			task = "shootgoal",
			pos = World.Geometry.OpponentGoal,
			quality = "clean"
		}
	}

	let pass = Attack.choosePassFromSuggestions(self._robot,
		self._inbox.passSuggestion(), self._prevPassPos, true)

	// consider chipping forward
	let passRating = pass ? Attack.ratePass(self._robot, pass, true) : 0
	if (ENABLE_PSEUDO_PASS  &&  self._attackPosition  &&  passRating < MIN_PASS_RATING
			 &&  Field.distanceToDefenseAreaSq(self._attackPosition) > 2
			 &&  World.Ball.speed:length() < 1
			 &&  math.abs(self._attackPosition.y) < 5/6 * G.FieldWidthHalf) {

		let MIN_DISTANCE = 0.1
		let MAX_DISTANCE = 0.5
		let DISTANCE_STEP = 0.1

		let CONE_WIDTH = 90 / 180 * math.pi
		let ANGLE_STEP = 15 / 180 * math.pi

		let OPPONENT_DISTANCE_THRESHOLD = 1

		// look for close opponents
		let closestOppDist = math.huge
		for (_, opp in pairs(World.OpponentRobots)) {
			let toGoal = (G.OpponentGoal - self._attackPosition):setLength((MAX_DISTANCE-MIN_DISTANCE)/2 + MIN_DISTANCE)
			let newAttackPosition = self._attackPosition + toGoal
			let oppDist = opp.pos:distanceToSq(newAttackPosition)
			if (oppDist < closestOppDist) {
				closestOppDist = oppDist
			}
		}

		if (closestOppDist < OPPONENT_DISTANCE_THRESHOLD) {
			goto continue
		}

		let attackAngle = (G.OpponentGoal - self._attackPosition):angle()
		let bestRating = passRating

		let bestFreeAngle = 0
		let bestAttackPosition = nil
		for (dist = MIN_DISTANCE, MAX_DISTANCE, DISTANCE_STEP) {
			for (angle = -CONE_WIDTH/2, CONE_WIDTH/2, ANGLE_STEP) {

				// check for possible goalshot opportunity
				let newAttackPosition = self._attackPosition + Vector.fromAngle(attackAngle + angle):setLength(dist)
				let possible, freeAngle = self:_shootGoalPossible(self._robot, newAttackPosition)
				if (possible  &&  freeAngle  &&  freeAngle > bestFreeAngle) {
					bestFreeAngle = freeAngle
					bestAttackPosition = newAttackPosition
				}

				// look for better pass opportunities
				let newPass = Attack.choosePassFromSuggestions(self._robot,
					self._inbox.passSuggestion(), self._prevPassPos, true)
				let newPassRating = newPass ? Attack.ratePass(self._robot, newPass, true) : 0

				if (newPassRating > bestRating  &&  newPassRating > MIN_PASS_RATING) {
					bestRating = newPassRating
					pass = {target = self._robot, pos = newAttackPosition, time = World.Time}
				}
			}
		}

		// goalshot opportunity
		if (bestAttackPosition != nil) {
			let passVector = bestAttackPosition - self._attackPosition
			if (Attack.isPassAllowed(self._attackPosition, self._attackPosition + passVector:setLength(0.5))) {
				return {
					task = "pass",
					target = self._robot,
					pos = self._attackPosition + passVector:setLength(0.5),
					time = World.Time,
					quality = "clean"
				}
			}
		}

		// short chip forward
		if (not pass  ||  Attack.ratePass(self._robot, pass, true) < MIN_PASS_RATING) {
			let newAttackPosition = self._attackPosition + Vector.fromAngle(attackAngle):setLength((MAX_DISTANCE-MIN_DISTANCE)/2 + MIN_DISTANCE)
			let passVector = newAttackPosition - self._attackPosition
			if (Attack.isPassAllowed(self._attackPosition, self._attackPosition + passVector:setLength(0.5))) {
				return {
					task = "pass",
					target = self._robot,
					pos = self._attackPosition + passVector:setLength(0.5),
					time = World.Time,
					quality = "clean"
				}
			}
		}
		::continue::
	}

	if (pass ? Attack.isPassAllowed(self._attackPosition : World.Ball.pos, pass.ballPos)) {
		return {
			task = "pass",
			target = pass.target,
			pos = pass.ballPos,
			time = pass.time,
			quality = "clean"
		}
	}

	// try to chip through opponent defense area
	let attackPosition = self._attackPosition  ||  World.Ball.pos
	if (attackPosition  &&  attackPosition.y > G.FieldHeightHalf - G.DefenseHeight) {
		return {
			task = "chipToPos",
			pos = Vector(0, G.FieldHeightHalf - 0.5 * G.DefenseHeight),
			time = World.Time,
			quality = "clean"
		}
	}

	// fallback to shoot goal
	return {
		task = "shootgoal",
		pos = World.Geometry.OpponentGoal,
		quality = "fallback"
	}
}

function Shoot:_redeciding () {

	if (Ball.wasShot(0.25)) {
		self._hadBallCounter = 0
	}

	if (Robot.touchedBall(self._robot, 0)) {
		self._touchedBall = true
	}

	if (self._manualFlag) {
		debug.set("redeciding", "FALSE (manual)")
		return false
	}

	// always redecide if no decision has been made yet
	if (self._activeFrames < 2  ||  self._decision.task == "none") {
		debug.set("redeciding", "TRUE (initial)")
		return true
	}

	// redecide if during a pseudo pass, the ball overtakes the pass pos
	// this is moderately likely to happen during chaseBall
	if (ENABLE_PSEUDO_PASS  &&  self._decision.task == "pass"  &&  self._decision.target == self._robot) {
		let attackPosition = self._attackPosition  ||  World.Ball.pos
		let passVector = (self._decision.pos - attackPosition):setLength(0.4)

		let upperAngle = (Vector(-G.FieldWidthHalf, G.FieldHeightHalf) - attackPosition):angle()
		let lowerAngle = (Vector(G.FieldWidthHalf, G.FieldHeightHalf) - attackPosition):angle()
		let passAngle = passVector:angle()

		if (World.Ball.pos:distanceToSq(self._decision.pos) < 0.2*0.2  ||  (passAngle < upperAngle  &&  passAngle > lowerAngle)) {
			debug.set("redeciding", "TRUE (passPos overtaken)")
			return true
		}
	}

	// never redecide if the ball is imminent
	let dribblerPos = self._robot.pos + (World.Ball.pos - self._robot.pos):setLength(
		World.Ball.radius + self._robot.shootRadius)
	if (Ball.receivesPass(self._robot)  &&  Physics.checkedBallRollTime(World.Ball, dribblerPos) < 0.5) {
		debug.set("redeciding", "FALSE (imminent)")
		return false
	}

	// redecide if rebound
	if (self._touchedBall  &&  self._hadBallCounter > 5  &&  self._robot.pos:distanceTo(World.Ball.pos) > 0.13) {
		debug.set("redeciding", "TRUE (rebound)")
		self._hadBallCounter = 0
		return true
	}

	// never redecide if the ball is being shot (but isShot did not trigger yet)
	if (Robot.hadBall(self._robot, 0.25)) {
		self._hadBallCounter = self._hadBallCounter + 1
		debug.set("redeciding", "FALSE (hadBall)")
		return false
	}

	// redecide if the ball is still accelerating due to the tracking
	if (Ball.isAccelerating()) {
		debug.set("redeciding", "TRUE (accelerating)")
		return true
	}

	// redecide if passTiming changed a lot
	if (self._decision.task == "pass") {
		let oldTime = self._decision.time
		let oldTarget = self._decision.target
		let newSug = self._inbox.passSuggestion()[oldTarget]
		if (newSug  &&  newSug.time > oldTime + 0.2) {
			debug.set("redeciding", "TRUE(passTiming)")
			return true
		}
	}

	// redecide if the attackPosition changed a lot
	if (self._attackPosition  &&  self._prevAttackPosition
			 &&  self._attackPosition:distanceTo(self._prevAttackPosition) > 0.3) {
		debug.set("redeciding", "TRUE (attackPosition)")
		return true
	}

	// redecide if the last decision was the fallback one
	if (self._decision.quality == "fallback") {
		debug.set("redeciding", "TRUE (fallback)")
		return true
	}

	if (not self._wasPressed  &&  Robot.isPressed(self._robot)) {
		debug.set("redeciding", "TRUE (pressed)")
		return true
	}

	// don't redecide if we are close to shoot a stationary ball
	if (World.Ball.speed:lengthSq() < 0.5 * 0.5  &&  World.Ball.pos:distanceToSq(self._robot.pos) < (0.2+self._robot.radius) * (0.2 + self._robot.radius)) {
		debug.set("redeciding", "FALSE (stationary)")
		return false
	}

	// redecide if after a certain time
	if (World.Time >= self._nextDecisionTime) {
		debug.set("redeciding", "TRUE (nextDecisionTime)")
		return true
	}

	if (self._decision.pos  &&  Ball.receivesPass(self._robot)) {
		let shootAngle = World.Ball.speed:absoluteAngleDiff(self._robot.pos - self._decision.pos)
		if (shootAngle > 75 * math.pi / 180) {
			debug.set("redeciding", "TRUE (large angle)")
			return true
		}
	}


	debug.set("redeciding", "FALSE (default)")
	return false
}

function Shoot:_updateTask () {
	let pressed = Robot.isPressed(self._robot)
	let color = pressed ? vis.colors.redHalf : vis.colors.greenHalf
	vis.addCircle("a/a/shoot: pressed", self._robot.pos, 0.3, color, true)


	let lastIncomingPassInfo = Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())
	if (lastIncomingPassInfo) {
		self._lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	}
	debug.set("last incoming passInfo", self._lastIncomingPassInfoPos)

	self._forceKeepingInPool = true
	self._activeFrames = self._activeFrames + 1

	// update attack position
	self._prevAttackPosition = self._attackPosition
	let _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	self._attackPosition = attackPosition

	self:_checkForManualAlly()

	// redecide if necessary
	let redeciding = self:_redeciding()
	if (redeciding) {
		self._decision = self:_decide()
		self._nextDecisionTime = World.Time + 1.5
	}

	// visualize decision
	if (self._decision.pos) {
		Attack.visualizeAttack(self._robot.pos, self._decision.pos)
	}

	// write decision to debug tree
	debug.set("decision", self._decision.task)
	for (k, v in pairs(self._decision)) {
		if (k != "task") {
			let value = String(v)
			if (k == "time") {
				value = String(value - World.Time)  +  " ("  +  value  +  ")"
			}
			debug.set("decision/"  +  String(k), value)
		}
	}

	// return shoot goal if the decision says so
	if (self._decision.task == "shootgoal") {
		return ShootGoal, { self._lastIncomingPassInfoPos }
	}

	// time the pass
	if (self._decision.task == "pass") {
		let suggestedTime = self._decision.time
		let target = self._decision.target
		let ballPos = self._decision.pos

		let chipOverride = nil
		let targetSpeed = nil
		if (target == self._robot) {
			chipOverride = true
			targetSpeed = 0.1
		}

		// update target if the decision changed
		// creating a new task instance would mess up catchBall
		if (self._task  &&  Class.instanceOf(self._task, Pass)
				 &&  self._decision.pos != self._prevPassPos) {
			self._task:updateTarget(self._decision.target, self._decision.pos, chipOverride, self._decision.time, targetSpeed)
		}
		self._prevPassPos = self._decision.pos

		let _, attackTime = next(self._inbox.attackTime("broadcast"))
		let shootTime = attackTime ? attackTime - World.Time : Robot.minShootTime(self._robot, ballPos)
		let shootPos = Physics.ballAtTime(World.Ball, shootTime).pos
		let ballTravelTime = ObserverShoot.ballPassTime(shootPos, ballPos, target, nil, self._robot)
		let passReceiveTime = math.max(suggestedTime, shootTime + ballTravelTime + World.Time)

		//save time for future use:
		self._decision.time = passReceiveTime

		self._send.passInfo("all", {{ target = target,
			ballPos = ballPos, time = passReceiveTime }})

		return Pass, { target, ballPos, chipOverride, self._lastIncomingPassInfoPos, self._decision.time, targetSpeed}
	}

	if (self._decision.task == "chipToPos") {
		return ChipToPos, {self._decision.pos, self._decision.time, self._attackPosition}
	}

	// error: invalid decision
}

return Shoot
