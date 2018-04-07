local Base = require "agent/base/behavior"
local DuelAssistant = Class("Agent.Attacker.DuelAssistant", Base)

local World = require "../base/world"
local Rating = require "util/rating"


local TaskDuelAssistant = require "task/attacker/duelassistant"


function DuelAssistant:_stop()
	self._opponentHasBall = false
	self._closerThanOpp = false
	self._lastChippedHysteresis = false
	self._active = false
	self._lastTrue = nil
end

function DuelAssistant:rateRobot(sender)
	local distanceToDuelRobot = self._robot.pos:distanceTo(sender.pos)
	local distanceToOwnGoal = World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
	local distanceBallToOwnGoal = World.Geometry.FriendlyGoal:distanceTo(World.Ball.pos)
	local distanceRobotToBall = World.Ball.pos:distanceTo(self._robot.pos)

	local rateDistanceToDuelRobot = Rating.valueToRating(distanceToDuelRobot, 4, 0)
	local rateDistanceToOwnGoal = Rating.valueToRating(distanceToOwnGoal, 8, 1)
	local rateDistanceBallToOwnGoal = Rating.valueToRating(distanceBallToOwnGoal, 8, 1)
	local rateDistanceRobotToBall = Rating.valueToRating(distanceRobotToBall, 4, 0)

	return (rateDistanceToDuelRobot + rateDistanceToOwnGoal
		+ rateDistanceBallToOwnGoal + rateDistanceRobotToBall) / 4

end

function DuelAssistant:check()
	if self._robot == self._inbox.mainAttacker().trainer then
		return false
	end

	local sender, _ = next(self._inbox.defendedOpponent())
	if not sender and not self._lastTrue then
		return false
	end
	if sender then
		local duellingRobot = sender
		if duellingRobot.pos:distanceTo(World.Ball.pos) > 1 then
			self._active = false
			self._lastTrue = nil
			return false
		end
		local rating = self:rateRobot(duellingRobot)
		self._send.exclusiveRole("trainer", { duelAssistant = rating })
	end

	local isDuelAssistant = (self._inbox.duelAssistant().trainer == self._robot)

	if isDuelAssistant then
		self._lastTrue = World.Time
		self._active = true
	elseif self._lastTrue and (World.Time - self._lastTrue) <= 1 then
		self._active = true
	else
		self._lastTrue = nil
		self._active = false
	end

	return self._active
end


function DuelAssistant:_updateTask()
	return TaskDuelAssistant
end

return DuelAssistant
