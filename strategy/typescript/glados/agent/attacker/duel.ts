import {Behavior} from "glados/agent/base/behavior";
let Duel = Class("Agent.Attacker.Duel", Base)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as World from "base/world";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";

let TaskDuel = require "task/shared/duel"


function Duel:_stop () {
	this._opponentHasBall = false
	this._closerThanOpp = false
	this._lastChippedHysteresis = false
	this._active = false
}

let SAFTY_SPACE = 0.05
let DIST_HYSTERESIS = 0.02 // must be always smaller than SAFTY_SPACE
let MAX_BALL_SPEED = 1
function Duel:genericCheck () {
	// if we receive the ball first, try shootgoal or something
	let receivesPass = Ball.receivesPass(this._robot)
	if (receivesPass) {
		let firstAtBall = true
		let selfDistToBall = this._robot.pos.distanceTo(World.Ball.pos)
		for (let opp of World.OpponentRobots) {
			if (Ball.receivesPass(opp)) {
				let oppDistToBall = opp.pos.distanceTo(World.Ball.pos)
				if (oppDistToBall < selfDistToBall) {
					let pointOnBallLine = opp.pos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
					if (opp.pos.distanceTo(pointOnBallLine) < 0.5) {
						let robotTime = Physics.robotTimeToPos(opp, pointOnBallLine, new Vector(0, 0))
						let ballOffset = World.Ball.speed.copy().setLength(World.Ball.radius + opp.shootRadius)
						let ballTime = Physics.checkedBallRollTime(World.Ball, pointOnBallLine - ballOffset)
						if (ballTime > robotTime + 0.1) {
							firstAtBall = false
						}
					}
				}
			}
		}
		if (firstAtBall) {
			debug.set("duel check", "firstAtBall")
			return false
		}
	}


	if (this._agent.beOffensive) {
		debug.set("duel check", "beOffensive")
		return false
	}

	// duel is not beneficial in opponent corners
	let cornerMinX = World.Geometry.FieldWidthHalf * (this._active ? 0.7 : 0.6)
	let cornerMinY = World.Geometry.FieldHeightHalf * (this._active ? 0.6 : 0.5)
	if (World.Ball.pos.y > cornerMinY && Math.abs(World.Ball.pos.x) > cornerMinX) {
		return false
	}

	// if an opponent controls the ball
	for (let opp of World.OpponentRobots) {
		if (Robot.controlsBall(opp, 0.3)) {
			debug.set("duel check", "opponent controls ball")
			return true
		}
	}

	// if the ball is shot fast at the opponent goal, dont duel it since it might be chipped by us
	let ballSpeed = World.Ball.speed.length()
	if (ballSpeed > MAX_BALL_SPEED + (this._lastChippedHysteresis ? 0 : 0.5)) {
		let intersection = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, World.Geometry.OpponentGoal, new Vector(1, 0))
		if (intersection ? Math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + (this._lastChippedHysteresis && 1 : 0)) {
			this._lastChippedHysteresis = true
			debug.set("duel check", "ball speed")
			return false
		} else {
			this._lastChippedHysteresis = false
		}
	} else {
		this._lastChippedHysteresis = false
	}

	// prefer passing instead of duelling when being in the opponent half of the field
	let ballYHysteresis = this._active ? 1.0 : 0.0
	let ballDefAreaHysteresis = this._active ? 0.8 : 0.4
	if (World.Ball.pos.y > ballYHysteresis && Field.distanceToOpponentDefenseArea(World.Ball.pos, 0) > ballDefAreaHysteresis) {
		debug.set("duel check", "attack area")
		return false
	}

	// if the opponent controls the ball, duel him
	let ballOwner = Ball.opponentBallOwner() || Ball.opponentBallDribbler()
	if (ballOwner) {
		let dist = this._closerThanOpp ? -SAFTY_SPACE : (-SAFTY_SPACE - DIST_HYSTERESIS)
		let dribblerPos = this._robot.pos + Vector.fromAngle(this._robot.dir) * this._robot.shootRadius
		let ballOwnerDribblerPos = ballOwner.pos + Vector.fromAngle(ballOwner.dir) * ballOwner.shootRadius
		// we are closer to the ball, so dont duel
		if ((dribblerPos.distanceTo(World.Ball.pos) - ballOwnerDribblerPos.distanceTo(World.Ball.pos)) < dist) {
			this._closerThanOpp = true
		} else {
			this._closerThanOpp = false
			debug.set("duel check closerThanOpp", this._closerThanOpp)
			debug.set("duel check", "closerThanOpp")
			return true
		}
		debug.set("duel check closerThanOpp", this._closerThanOpp)
	} else {
		this._closerThanOpp = false
	}

	// if any opponent receives the ball (and we don't), duel him
	// this may cause duel to get active A LOT
	for (_,r in ipairs(World.OpponentRobots)) {
		if (Ball.receivesPass(r) && r.pos.distanceTo(this._robot.pos) < 1) {
			debug.set("duel check", "oppGetsBall")
			return true
		}
	}

	let timeToBallHysteresis = this._active ? 0 : 0.3
	if (not Ball.receivesPass(this._robot)) {
		let _, oppTime = Ball.firstRobotAtBall(World.OpponentRobots)
		if (oppTime + timeToBallHysteresis < Robot.minTimeToBall(this._robot)) {
			debug.set("duel check", "hysteresis")
			return true
		}
	}
	debug.set("duel check", "default")

	return false
}


function Duel:check () {
	let isMainAttacker = (this._inbox.mainAttacker().trainer == this._robot)
	this._forceKeepingInPool = isMainAttacker

	if (not isMainAttacker) {
		debug.set("duel check", "not mainAttacker")
		this._active = false
	} else {
		this._active = this.genericCheck()
	}
	return this._active
}


function Duel:_updateTask () {
	return TaskDuel
}

return Duel
