let Base = require "agent/base/behavior"
let PenaltyShootout = Class("Agent.Attacker.PenaltyShootout", Base)

let Referee = require "../base/referee"
let World = require "../base/world"
let G = World.Geometry

let Goal = require "observer/goal"
let Robot = require "observer/robot"
let MoveToStaticBall = require "task/attacker/movetostaticball"
let ShootGoal = require "task/attacker/shootgoal"
let StopAttack = require "task/attacker/stopattack"
let MoveToBall = require "task/attacker/movetoball"
let Dribble = require "task/attacker/dribble"
let Pass = require "task/shared/pass"
let Field = require "../base/field"

let vis = require "../base/vis"
let debug = require "../base/debug"


let DISTANCE_TO_DEFENSE_AREA = 0.6 // the furthest we'll go before we shoot
let MIN_RELATIVE_SECTOR_SIZE = 1/3
let DRIBBLING_DISTANCE = 0.075 // Ball and Robot must be at least this far apart to reset dribbling


function PenaltyShootout:_stop () {
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
	self._forceDesperate = false
	self._changeContact = false
	self._baseDribblePos = Vector(0, G.FieldHeightHalf)
	self._addPos = Vector(0, 0)
	self._state = nil
	self._futureKeeper = {pos = World.Geometry.OpponentGoal, speed = Vector(0,0.1), radius = 0.09}
	self._lastKeeper = {pos = World.Geometry.OpponentGoal, speed = Vector(0,0.1), radius = 0.09}
}

function PenaltyShootout:check () {
	let mainAttacker = self._inbox.mainAttacker().trainer == self._robot
	let isPenalty = World.RefereeState == "PenaltyOffensivePrepare"  ||  World.RefereeState == "PenaltyOffensive"
	let isShootout = World.GameStage == "PenaltyShootout"
	// log("")
	// log("check")
	// log("mainAttacker: "..tostring(mainAttacker))
	// log("isPenalty: "..tostring(isPenalty))
	// log("isShootout: "..tostring(isShootout))
	// log("onGoing: "..tostring(self:_checkPenaltyOngoing()))
	return mainAttacker ? isShootout  &&  (isPenalty : self:_checkPenaltyOngoing())
}

function PenaltyShootout:_checkPenaltyOngoing () {
	return self._penaltyStartTime  &&  World.Time - self._penaltyStartTime < 15  &&  not Referee.isStopState()
}

function PenaltyShootout:_updateDribbling () {
	// log("update")
	if (not self._contactPoint  &&  Robot.hadBall(self._robot, 0)) {
		// log("1")
		self._contactPoint = self._robot.pos
		self._changeContact = true
	} else if (self._contactPoint  &&  World.Ball.pos:distanceTo(self._robot.pos) > DRIBBLING_DISTANCE + self._robot.radius + World.Ball.radius) {
		// log("2")
		self._contactPoint = nil
		self._changeContact = true
	} else {
		self._changeContact = false
	}
}

function PenaltyShootout:_updateShootGoal () {
	if (World.OpponentKeeper  &&  World.OpponentKeeper.pos) {
		self._futureKeeper = {pos = World.OpponentKeeper.pos, radius = World.OpponentKeeper.radius}
	}
	let lastContact = self._contactPoint
	let addDistance = lastContact ? math.max(0, lastContact:distanceTo(World.Ball.pos) - 0.5)*3 : 0.2
		self._futureKeeper.pos = self._futureKeeper.pos + self._lastKeeper.speed * 0.4
	if (self._state == "pass") {
		self._futureKeeper.pos = self._futureKeeper.pos + (self._robot.pos - self._futureKeeper.pos):setLength(self._robot.speed:length()/3)
	}

	debug.push("Shootgoal Criterias")
	if (self._penaltyStartTime) {
		let timeSinceStart = World.Time - self._penaltyStartTime
		let criteriaTime = timeSinceStart > 8
		debug.push("Time Criteria (8s)", criteriaTime)
		debug.set("timeSinceStart", timeSinceStart)
		debug.pop()

		let ballPosY = World.Ball.pos.y
		let distanceToGoalLine = (World.RULEVERSION == "2017" ? G.DefenseRadius : G.DefenseHeight) + DISTANCE_TO_DEFENSE_AREA
		let criticalMark = G.FieldHeightHalf - distanceToGoalLine
		let criteriaPos = ballPosY + addDistance > criticalMark
		debug.push("Position Criteria", criteriaPos)
		debug.set("ballPosY", ballPosY)
		debug.set("addDistance", addDistance)
		debug.set("DistanceToGoalLine", distanceToGoalLine)
		debug.set("CriticalMark", criticalMark)
		debug.pop()
		vis.addCircle("a/a/penaltyshootout: futureKeeper", self._futureKeeper.pos, 0.1, vis.colors.green, false)

		let sector = Goal.largestFreeSector(World.Ball.pos, {self._futureKeeper}, true)
		let width = sector ? math.abs(sector[1] - sector[2]) : 0
		let angle = 2 * math.atan((G.GoalWidth / 2) / (G.FieldHeightHalf - self._robot.pos.y))
		let criteriaAngle = width < angle * MIN_RELATIVE_SECTOR_SIZE
		debug.push("Angle Criteria", criteriaAngle)
		debug.set("width", width*180/math.pi)
		debug.set("minRelativeSectorSize", MIN_RELATIVE_SECTOR_SIZE)
		debug.set("maxAngleForPosition(in deg)", 180/math.pi * angle)
		debug.pop()
		if (self._shootGoalFlag  ||  criteriaTime  ||  criteriaPos  ||  criteriaAngle) {
			self._shootGoalFlag = true
		}
	} else {
		debug.push("Time Criteria (8s)")
		debug.set("time", "not set yet")
		debug.pop()
	}
	debug.pop()
}

function PenaltyShootout:_updateTask () {
	let lastContact = self._contactPoint
	let robotPos = self._robot.pos
	let freeway = self._state == "pass" ? 0.1 : 0
	let keeperPos
	if (World.OpponentKeeper  &&  World.OpponentKeeper.pos) {
		self._lastKeeper = World.OpponentKeeper
	}
	keeperPos = self._lastKeeper.pos

	self:_updateDribbling()
	self:_updateShootGoal()
	debug.set("ShootGoalFlag", self._shootGoalFlag)
	//log(self._shootGoalFlag)
	if (lastContact) {
		vis.addCircle("1test", lastContact, 1, vis.colors.green, false)
	}

	if (World.RefereeState == "PenaltyOffensive"  &&  not self._penaltyStartTime) {
		// log("Start Time set")
		self._penaltyStartTime = World.Time
	}

	if (World.RefereeState == "PenaltyOffensivePrepare") {
		return MoveToStaticBall, {math.pi / 2, 0.1}
	} else if (self._shootGoalFlag) {
		return ShootGoal//, nil, true
	} else if (lastContact  &&  lastContact:distanceTo(World.Ball.pos) > 1 + 0.3) {
		return ShootGoal
	} else if (not lastContact  ||  robotPos:distanceTo(World.Ball.pos) > self._robot.radius + World.Ball.radius + freeway) {
		return MoveToBall, {0.01}
	} else if (lastContact  &&  lastContact:distanceTo(World.Ball.pos) > 1 - 0.05) {
		return StopAttack
	} else if (lastContact  &&  lastContact:distanceTo(World.Ball.pos) > 1 - 0.3) {
		//log("distance: "..lastContact:distanceTo(robotPos))
		let shootlength = (0.1 + self._robot.speed:length())
		if (self._lastKeeper.speed.y > 0.5  &&  self._robot.pos.y > 2) {
			return Pass, {nil, World.Ball.pos + Vector(0.4, 0.5), false, nil, nil, shootlength*0.6}
		} else {
			let shootpos = Vector(0, shootlength/3 + 0.2) * 0.6 + World.Ball.speed/3 * 0.4
			self._state = "pass"
			return Pass, {nil, World.Ball.pos + shootpos, false, nil, nil, shootlength}, true
		}
	} else if (lastContact  &&  lastContact:distanceTo(World.Ball.pos) > 1 - 0.35) {
		return MoveToBall, {0.00}
	} else {
		self._state = "dribble"
		// self._robot:setDribblerSpeed(0.5)
		// return MoveToBall, {-0.1}, self._changeContact
		let rate = 0.02 * robotPos:distanceTo(keeperPos)
		// if lastContact:distanceTo(World.Ball.pos) < 1 - 0.2 then
			if (keeperPos.x < 0) {
				self._addPos.x = (self._addPos.x + rate) / (1+math.abs(robotPos.x - keeperPos.x))
			} else {
				self._addPos.x = (self._addPos.x - rate) / (1+math.abs(robotPos.x - keeperPos.x))
			}
		// else
		// 	self._addPos.x = 0
		// end
		let dribblePoint = self._baseDribblePos + self._addPos
		let intersection = Field.intersectRayDefenseArea(dribblePoint, robotPos - dribblePoint, 0.2, false)
		if (intersection) {
			dribblePoint = intersection
		}
		return Dribble, {dribblePoint}, true
	}
}

return PenaltyShootout
