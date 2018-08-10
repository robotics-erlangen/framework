let Base = require "agent/base/behavior"
let DuelAssistant = Class("Agent.Attacker.DuelAssistant", Base)

let World = require "../base/world"
let Rating = require "util/rating"


let TaskDuelAssistant = require "task/attacker/duelassistant"


function DuelAssistant:_stop () {
	self._opponentHasBall = false
	self._closerThanOpp = false
	self._lastChippedHysteresis = false
	self._lastTrue = nil
}

function DuelAssistant:rateRobot (sender) {
	let distanceToDuelRobot = self._robot.pos:distanceTo(sender.pos)
	let distanceToOwnGoal = World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
	let distanceBallToOwnGoal = World.Geometry.FriendlyGoal:distanceTo(World.Ball.pos)
	let distanceRobotToBall = World.Ball.pos:distanceTo(self._robot.pos)

	let rateDistanceToDuelRobot = Rating.valueToRating(distanceToDuelRobot, 4, 0)
	let rateDistanceToOwnGoal = Rating.valueToRating(distanceToOwnGoal, 8, 1)
	let rateDistanceBallToOwnGoal = Rating.valueToRating(distanceBallToOwnGoal, 8, 1)
	let rateDistanceRobotToBall = Rating.valueToRating(distanceRobotToBall, 4, 0)

	return (rateDistanceToDuelRobot + rateDistanceToOwnGoal
		+ rateDistanceBallToOwnGoal + rateDistanceRobotToBall) / 4

}

function DuelAssistant:check () {
	if (self._robot == self._inbox.mainAttacker().trainer) {
		self._lastTrue = nil
		return false
	}

	let sender, _ = next(self._inbox.defendedOpponent())
	if (not sender  &&  not self._lastTrue) {
		return false
	}
	if (sender) {
		let duellingRobot = sender
		if (duellingRobot.pos:distanceTo(World.Ball.pos) > 1) {
			self._lastTrue = nil
			return false
		}
		let rating = self:rateRobot(duellingRobot)
		self._send.exclusiveRole("trainer", { duelAssistant = rating })
	}

	let isDuelAssistant = (self._inbox.duelAssistant().trainer == self._robot)

	if (isDuelAssistant) {
		self._lastTrue = World.Time
	} else if (not (self._lastTrue  &&  (World.Time - self._lastTrue) <= 1)) {
		self._lastTrue = nil
	}

	return self._lastTrue
}


function DuelAssistant:_updateTask () {
	return TaskDuelAssistant
}

return DuelAssistant
