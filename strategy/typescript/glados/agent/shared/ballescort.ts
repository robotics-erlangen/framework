let Base = require "agent/base/behavior"
let BallEscort = Class("Agent.Shared.BallEscort", Base)

let debug = require "../base/debug"
let Field = require "../base/field"
let Referee = require "../base/referee"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let RefereeObs = require "observer/referee"
let Robot = require "observer/robot"
let BallEscortTask = require "task/shared/ballescort"

function BallEscort:_init () {
	self._minRobot = nil
}

function BallEscort:_stop () {
}

function BallEscort:_checkOpponentTimings () {
	let minOppRobot, minOppTime = Ball.firstRobotAtBall(World.OpponentRobots)

	if (minOppTime == math.huge) {
		// firstRobotAtBall calls minTimeToBall which assumes the robot wants to look at it's opponent's goal
		// This can lead to situations where the function returns math.huge even though it wouldn't if we checked
		// with a different position (here: the ball position while receiving a pass)
		for (_, robot in pairs(World.OpponentRobots)) {
			if (Ball.receivesPass(robot)) {
				let time = Physics.robotTimeToBall(robot, World.Ball, World.Ball.pos, robot.maxSpeed)
				if (time < minOppTime) {
					minOppRobot = robot
					minOppTime = time
				}
			}
		}
	}

	return minOppRobot, minOppTime
}

function BallEscort:_isReachabilityOk (oppTime, ownTime) {
	if (not (oppTime < math.huge)) {
		return true
	}

	if (not self._active) {
		return false
	}

	return oppTime - ownTime > 1
}

function BallEscort:check () {
	let shotHysteresis = self._active ? 0.075 : 0.15

	if (not (World.RefereeState == "Game"  ||  World.RefereeState == "GameForce")
			 ||  not Referee.opponentTouchedLast()
			 ||  Ball.wasShot(shotHysteresis)) {
		return false
	}

	let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)

	debug.set("BallEscort/ballOutPos", ballOutPos)

	// ballOutPos should not be in defense area
	if (not ballOutPos  ||  math.abs(ballOutPos.x) <= Field.defenseBaselineIntersectionDistance()) {
		return false
	}

	let minOppRobot, minOppTime = self:_checkOpponentTimings()
	let ownTimeToBall = Robot.minTimeToBall(self._robot)

	debug.set("BallEscort/ownTimeToBall", ownTimeToBall)
	debug.set("BallEscort/minRobot", minOppRobot)
	debug.set("BallEscort/minOppTime", minOppTime)

	if (minOppRobot) {
		self._minRobot = minOppRobot
	}

	if (not self:_isReachabilityOk(minOppTime, ownTimeToBall)) {
		return false
	}

	let icing = RefereeObs.opponentIcingPredicted(World.Ball)
	debug.set("BallEscort/icing", icing)

	let distToBorder = self._active ? 0.7 : 0.5

	// If we can reach the ball we should try to if we are not already close to the field border
	if (not icing  &&  ownTimeToBall < math.huge  &&  math.abs(self._robot.pos.x) < World.Geometry.FieldWidthHalf - distToBorder  &&  math.abs(self._robot.pos.y) < World.Geometry.FieldHeightHalf - distToBorder) {
		return false
	}

	self:_applyForMainAttacker()
	if (self._inbox.mainAttacker().trainer != self._robot) {
		return false
	}

	return true
}

function BallEscort:_updateTask () {
	return BallEscortTask, {self._minRobot}
}

return BallEscort
