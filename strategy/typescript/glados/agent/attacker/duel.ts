let Base = require "agent/base/behavior"
let Duel = Class("Agent.Attacker.Duel", Base)

let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"

let TaskDuel = require "task/shared/duel"


function Duel:_stop () {
	self._opponentHasBall = false
	self._closerThanOpp = false
	self._lastChippedHysteresis = false
	self._active = false
}

let SAFTY_SPACE = 0.05
let DIST_HYSTERESIS = 0.02 // must be always smaller than SAFTY_SPACE
let MAX_BALL_SPEED = 1
function Duel:genericCheck () {
	// if we receive the ball first, try shootgoal or something
	let receivesPass = Ball.receivesPass(self._robot)
	if (receivesPass) {
		let firstAtBall = true
		let selfDistToBall = self._robot.pos:distanceTo(World.Ball.pos)
		for (_,opp in ipairs(World.OpponentRobots)) {
			if (Ball.receivesPass(opp)) {
				let oppDistToBall = opp.pos:distanceTo(World.Ball.pos)
				if (oppDistToBall < selfDistToBall) {
					let pointOnBallLine = opp.pos:orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)
					if (opp.pos:distanceTo(pointOnBallLine) < 0.5) {
						let robotTime = Physics.robotTimeToPos(opp, pointOnBallLine, Vector(0, 0))
						let ballOffset = World.Ball.speed:copy():setLength(World.Ball.radius + opp.shootRadius)
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


	if (self._agent.beOffensive) {
		debug.set("duel check", "beOffensive")
		return false
	}

	// duel is not beneficial in opponent corners
	let cornerMinX = World.Geometry.FieldWidthHalf * (self._active ? 0.7 : 0.6)
	let cornerMinY = World.Geometry.FieldHeightHalf * (self._active ? 0.6 : 0.5)
	if (World.Ball.pos.y > cornerMinY  &&  math.abs(World.Ball.pos.x) > cornerMinX) {
		return false
	}

	// if an opponent controls the ball
	for (_,opp in ipairs(World.OpponentRobots)) {
		if (Robot.controlsBall(opp, 0.3)) {
			debug.set("duel check", "opponent controls ball")
			return true
		}
	}

	// if the ball is shot fast at the opponent goal, dont duel it since it might be chipped by us
	let ballSpeed = World.Ball.speed:length()
	if (ballSpeed > MAX_BALL_SPEED + (self._lastChippedHysteresis ? 0 : 0.5)) {
		let intersection = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, World.Geometry.OpponentGoal, Vector(1, 0))
		if (intersection ? math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + (self._lastChippedHysteresis  &&  1 : 0)) {
			self._lastChippedHysteresis = true
			debug.set("duel check", "ball speed")
			return false
		} else {
			self._lastChippedHysteresis = false
		}
	} else {
		self._lastChippedHysteresis = false
	}

	// prefer passing instead of duelling when being in the opponent half of the field
	let ballYHysteresis = self._active ? 1.0 : 0.0
	let ballDefAreaHysteresis = self._active ? 0.8 : 0.4
	if (World.Ball.pos.y > ballYHysteresis  &&  Field.distanceToOpponentDefenseArea(World.Ball.pos, 0) > ballDefAreaHysteresis) {
		debug.set("duel check", "attack area")
		return false
	}

	// if the opponent controls the ball, duel him
	let ballOwner = Ball.opponentBallOwner()  ||  Ball.opponentBallDribbler()
	if (ballOwner) {
		let dist = self._closerThanOpp ? -SAFTY_SPACE : (-SAFTY_SPACE - DIST_HYSTERESIS)
		let dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * self._robot.shootRadius
		let ballOwnerDribblerPos = ballOwner.pos + Vector.fromAngle(ballOwner.dir) * ballOwner.shootRadius
		// we are closer to the ball, so dont duel
		if ((dribblerPos:distanceTo(World.Ball.pos) - ballOwnerDribblerPos:distanceTo(World.Ball.pos)) < dist) {
			self._closerThanOpp = true
		} else {
			self._closerThanOpp = false
			debug.set("duel check closerThanOpp", self._closerThanOpp)
			debug.set("duel check", "closerThanOpp")
			return true
		}
		debug.set("duel check closerThanOpp", self._closerThanOpp)
	} else {
		self._closerThanOpp = false
	}

	// if any opponent receives the ball (and we don't), duel him
	// this may cause duel to get active A LOT
	for (_,r in ipairs(World.OpponentRobots)) {
		if (Ball.receivesPass(r)  &&  r.pos:distanceTo(self._robot.pos) < 1) {
			debug.set("duel check", "oppGetsBall")
			return true
		}
	}

	let timeToBallHysteresis = self._active ? 0 : 0.3
	if (not Ball.receivesPass(self._robot)) {
		let _, oppTime = Ball.firstRobotAtBall(World.OpponentRobots)
		if (oppTime + timeToBallHysteresis < Robot.minTimeToBall(self._robot)) {
			debug.set("duel check", "hysteresis")
			return true
		}
	}
	debug.set("duel check", "default")

	return false
}


function Duel:check () {
	let isMainAttacker = (self._inbox.mainAttacker().trainer == self._robot)
	self._forceKeepingInPool = isMainAttacker

	if (not isMainAttacker) {
		debug.set("duel check", "not mainAttacker")
		self._active = false
	} else {
		self._active = self:genericCheck()
	}
	return self._active
}


function Duel:_updateTask () {
	return TaskDuel
}

return Duel
