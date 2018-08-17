let Base = require "agent/base/behavior"
let BallEscort = Class("Agent.Shared.BallEscort", Base)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as Ball from "glados/tobserver/ball";
import * as Physics from "glados/observer/physics";
let RefereeObs = require "observer/referee"
import * as Robot from "glados/observer/robot";
let BallEscortTask = require "task/shared/ballescort"

function BallEscort:_init () {
	this._minRobot = nil
}

function BallEscort:_stop () {
}

function BallEscort:_checkOpponentTimings () {
	let minOppRobot, minOppTime = Ball.firstRobotAtBall(World.OpponentRobots)

	if (minOppTime == Infinity) {
		// firstRobotAtBall calls minTimeToBall which assumes the robot wants to look at it's opponent's goal
		// This can lead to situations where the function returns Infinity even though it wouldn't if we checked
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
	if (not (oppTime < Infinity)) {
		return true
	}

	if (not this._active) {
		return false
	}

	return oppTime - ownTime > 1
}

function BallEscort:check () {
	let shotHysteresis = this._active ? 0.075 : 0.15

	if (not (World.RefereeState == "Game" || World.RefereeState == "GameForce")
			 ||  not Referee.opponentTouchedLast()
			 ||  Ball.wasShot(shotHysteresis)) {
		return false
	}

	let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)

	debug.set("BallEscort/ballOutPos", ballOutPos)

	// ballOutPos should not be in defense area
	if (not ballOutPos || Math.abs(ballOutPos.x) <= Field.defenseBaselineIntersectionDistance()) {
		return false
	}

	let minOppRobot, minOppTime = this._checkOpponentTimings()
	let ownTimeToBall = Robot.minTimeToBall(this._robot)

	debug.set("BallEscort/ownTimeToBall", ownTimeToBall)
	debug.set("BallEscort/minRobot", minOppRobot)
	debug.set("BallEscort/minOppTime", minOppTime)

	if (minOppRobot) {
		this._minRobot = minOppRobot
	}

	if (not this._isReachabilityOk(minOppTime, ownTimeToBall)) {
		return false
	}

	let icing = RefereeObs.opponentIcingPredicted(World.Ball)
	debug.set("BallEscort/icing", icing)

	let distToBorder = this._active ? 0.7 : 0.5

	// If we can reach the ball we should try to if we are not already close to the field border
	if (not icing && ownTimeToBall < Infinity && Math.abs(this._robot.pos.x) < World.Geometry.FieldWidthHalf - distToBorder && Math.abs(this._robot.pos.y) < World.Geometry.FieldHeightHalf - distToBorder) {
		return false
	}

	this._applyForMainAttacker()
	if (this._inbox.mainAttacker().trainer != this._robot) {
		return false
	}

	return true
}

function BallEscort:_updateTask () {
	return BallEscortTask, {this._minRobot}
}

return BallEscort
