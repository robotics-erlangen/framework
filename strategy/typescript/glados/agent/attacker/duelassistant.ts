import {Behavior} from "glados/agent/base/behavior";
let DuelAssistant = Class("Agent.Attacker.DuelAssistant", Base)

import * as World from "base/world";
import * as Rating from "glados/util/rating";


let TaskDuelAssistant = require "task/attacker/duelassistant"


function DuelAssistant:_stop () {
	this._opponentHasBall = false
	this._closerThanOpp = false
	this._lastChippedHysteresis = false
	this._lastTrue = nil
}

function DuelAssistant:rateRobot (sender) {
	let distanceToDuelRobot = this._robot.pos.distanceTo(sender.pos)
	let distanceToOwnGoal = World.Geometry.FriendlyGoal.distanceTo(this._robot.pos)
	let distanceBallToOwnGoal = World.Geometry.FriendlyGoal.distanceTo(World.Ball.pos)
	let distanceRobotToBall = World.Ball.pos.distanceTo(this._robot.pos)

	let rateDistanceToDuelRobot = Rating.valueToRating(distanceToDuelRobot, 4, 0)
	let rateDistanceToOwnGoal = Rating.valueToRating(distanceToOwnGoal, 8, 1)
	let rateDistanceBallToOwnGoal = Rating.valueToRating(distanceBallToOwnGoal, 8, 1)
	let rateDistanceRobotToBall = Rating.valueToRating(distanceRobotToBall, 4, 0)

	return (rateDistanceToDuelRobot + rateDistanceToOwnGoal
		+ rateDistanceBallToOwnGoal + rateDistanceRobotToBall) / 4

}

function DuelAssistant:check () {
	if (this._robot == this._inbox.mainAttacker().trainer) {
		this._lastTrue = nil
		return false
	}

	let sender, _ = next(this._inbox.defendedOpponent())
	if (not sender && not this._lastTrue) {
		return false
	}
	if (sender) {
		let duellingRobot = sender
		if (duellingRobot.pos.distanceTo(World.Ball.pos) > 1) {
			this._lastTrue = nil
			return false
		}
		let rating = this.rateRobot(duellingRobot)
		this._send.exclusiveRole("trainer", { duelAssistant = rating })
	}

	let isDuelAssistant = (this._inbox.duelAssistant().trainer == this._robot)

	if (isDuelAssistant) {
		this._lastTrue = World.Time
	} else if (not (this._lastTrue && (World.Time - this._lastTrue) <= 1)) {
		this._lastTrue = nil
	}

	return this._lastTrue
}


function DuelAssistant:_updateTask () {
	return TaskDuelAssistant
}

return DuelAssistant
