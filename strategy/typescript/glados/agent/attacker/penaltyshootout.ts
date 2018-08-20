import {Behavior} from "glados/agent/base/behavior";
let PenaltyShootout = Class("Agent.Attacker.PenaltyShootout", Base)

import * as Referee from "base/referee";
import * as World from "base/world";
let G = World.Geometry

import * as Goal from "glados/observer/goal";
import * as Robot from "glados/observer/robot";
let MoveToStaticBall = require "task/attacker/movetostaticball"
import {ShootGoal} from "glados/task/attacker/shootgoal";
let StopAttack = require "task/attacker/stopattack"
let MoveToBall = require "task/attacker/movetoball"
let Dribble = require "task/attacker/dribble"
import {Pass} from "glados/task/shared/pass";
import * as Field from "base/field";

import * as vis from "base/vis";
import * as debug from "base/debug";


let DISTANCE_TO_DEFENSE_AREA = 0.6 // the furthest we'll go before we shoot
let MIN_RELATIVE_SECTOR_SIZE = 1/3
let DRIBBLING_DISTANCE = 0.075 // Ball and Robot must be at least this far apart to reset dribbling


function PenaltyShootout:_stop () {
	this._penaltyStartTime = nil
	this._contactPoint = nil
	this._shootGoalFlag = false
	this._forceDesperate = false
	this._changeContact = false
	this._baseDribblePos = new Vector(0, G.FieldHeightHalf)
	this._addPos = new Vector(0, 0)
	this._state = nil
	this._futureKeeper = {pos: World.Geometry.OpponentGoal, speed = new Vector(0,0.1), radius = 0.09}
	this._lastKeeper = {pos: World.Geometry.OpponentGoal, speed = new Vector(0,0.1), radius = 0.09}
}

function PenaltyShootout:check () {
	let mainAttacker = this._inbox.mainAttacker().trainer == this._robot
	let isPenalty = World.RefereeState == "PenaltyOffensivePrepare" || World.RefereeState == "PenaltyOffensive"
	let isShootout = World.GameStage == "PenaltyShootout"
	// log("")
	// log("check")
	// log("mainAttacker: "+tostring(mainAttacker))
	// log("isPenalty: "+tostring(isPenalty))
	// log("isShootout: "+tostring(isShootout))
	// log("onGoing: "+tostring(this._checkPenaltyOngoing()))
	return mainAttacker ? isShootout && (isPenalty : this._checkPenaltyOngoing())
}

function PenaltyShootout:_checkPenaltyOngoing () {
	return this._penaltyStartTime && World.Time - this._penaltyStartTime < 15 && not Referee.isStopState()
}

function PenaltyShootout:_updateDribbling () {
	// log("update")
	if (not this._contactPoint && Robot.hadBall(this._robot, 0)) {
		// log("1")
		this._contactPoint = this._robot.pos
		this._changeContact = true
	} else if (this._contactPoint && World.Ball.pos.distanceTo(this._robot.pos) > DRIBBLING_DISTANCE + this._robot.radius + World.Ball.radius) {
		// log("2")
		this._contactPoint = nil
		this._changeContact = true
	} else {
		this._changeContact = false
	}
}

function PenaltyShootout:_updateShootGoal () {
	if (World.OpponentKeeper && World.OpponentKeeper.pos) {
		this._futureKeeper = {pos: World.OpponentKeeper.pos, radius = World.OpponentKeeper.radius}
	}
	let lastContact = this._contactPoint
	let addDistance = lastContact ? Math.max(0, lastContact.distanceTo(World.Ball.pos) - 0.5)*3 : 0.2
		this._futureKeeper.pos = this._futureKeeper.pos + this._lastKeeper.speed * 0.4
	if (this._state == "pass") {
		this._futureKeeper.pos = this._futureKeeper.pos + (this._robot.pos - this._futureKeeper.pos).setLength(this._robot.speed.length()/3)
	}

	debug.push("Shootgoal Criterias")
	if (this._penaltyStartTime) {
		let timeSinceStart = World.Time - this._penaltyStartTime
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
		vis.addCircle("a/a/penaltyshootout: futureKeeper", this._futureKeeper.pos, 0.1, vis.colors.green, false)

		let sector = Goal.largestFreeSector(World.Ball.pos, {this._futureKeeper}, true)
		let width = sector ? Math.abs(sector[1] - sector[2]) : 0
		let angle = 2 * Math.atan((G.GoalWidth / 2) / (G.FieldHeightHalf - this._robot.pos.y))
		let criteriaAngle = width < angle * MIN_RELATIVE_SECTOR_SIZE
		debug.push("Angle Criteria", criteriaAngle)
		debug.set("width", width*180/Math.PI)
		debug.set("minRelativeSectorSize", MIN_RELATIVE_SECTOR_SIZE)
		debug.set("maxAngleForPosition(in deg)", 180/Math.PI * angle)
		debug.pop()
		if (this._shootGoalFlag || criteriaTime || criteriaPos || criteriaAngle) {
			this._shootGoalFlag = true
		}
	} else {
		debug.push("Time Criteria (8s)")
		debug.set("time", "not set yet")
		debug.pop()
	}
	debug.pop()
}

function PenaltyShootout:_updateTask () {
	let lastContact = this._contactPoint
	let robotPos = this._robot.pos
	let freeway = this._state == "pass" ? 0.1 : 0
	let keeperPos
	if (World.OpponentKeeper && World.OpponentKeeper.pos) {
		this._lastKeeper = World.OpponentKeeper
	}
	keeperPos = this._lastKeeper.pos

	this._updateDribbling()
	this._updateShootGoal()
	debug.set("ShootGoalFlag", this._shootGoalFlag)
	//log(this._shootGoalFlag)
	if (lastContact) {
		vis.addCircle("1test", lastContact, 1, vis.colors.green, false)
	}

	if (World.RefereeState == "PenaltyOffensive" && not this._penaltyStartTime) {
		// log("Start Time set")
		this._penaltyStartTime = World.Time
	}

	if (World.RefereeState == "PenaltyOffensivePrepare") {
		return MoveToStaticBall, {Math.PI / 2, 0.1}
	} else if (this._shootGoalFlag) {
		return ShootGoal//, undefined, true
	} else if (lastContact && lastContact.distanceTo(World.Ball.pos) > 1 + 0.3) {
		return ShootGoal
	} else if (not lastContact || robotPos.distanceTo(World.Ball.pos) > this._robot.radius + World.Ball.radius + freeway) {
		return MoveToBall, {0.01}
	} else if (lastContact && lastContact.distanceTo(World.Ball.pos) > 1 - 0.05) {
		return StopAttack
	} else if (lastContact && lastContact.distanceTo(World.Ball.pos) > 1 - 0.3) {
		//log("distance: "+lastContact.distanceTo(robotPos))
		let shootlength = (0.1 + this._robot.speed.length())
		if (this._lastKeeper.speed.y > 0.5 && this._robot.pos.y > 2) {
			return Pass, {nil, World.Ball.pos + new Vector(0.4, 0.5), false, undefined, undefined, shootlength*0.6}
		} else {
			let shootpos = new Vector(0, shootlength/3 + 0.2) * 0.6 + World.Ball.speed/3 * 0.4
			this._state = "pass"
			return Pass, {nil, World.Ball.pos + shootpos, false, undefined, undefined, shootlength}, true
		}
	} else if (lastContact && lastContact.distanceTo(World.Ball.pos) > 1 - 0.35) {
		return MoveToBall, {0.00}
	} else {
		this._state = "dribble"
		// this._robot:setDribblerSpeed(0.5)
		// return MoveToBall, {-0.1}, this._changeContact
		let rate = 0.02 * robotPos.distanceTo(keeperPos)
		// if lastContact.distanceTo(World.Ball.pos) < 1 - 0.2 then
			if (keeperPos.x < 0) {
				this._addPos.x = (this._addPos.x + rate) / (1+Math.abs(robotPos.x - keeperPos.x))
			} else {
				this._addPos.x = (this._addPos.x - rate) / (1+Math.abs(robotPos.x - keeperPos.x))
			}
		// else
		// 	this._addPos.x = 0
		// end
		let dribblePoint = this._baseDribblePos + this._addPos
		let intersection = Field.intersectRayDefenseArea(dribblePoint, robotPos - dribblePoint, 0.2, false)
		if (intersection) {
			dribblePoint = intersection
		}
		return Dribble, {dribblePoint}, true
	}
}

return PenaltyShootout
