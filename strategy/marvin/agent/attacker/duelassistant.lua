local Base = require "agent/base/behavior"
local DuelAssistant = Class("Agent.Attacker.DuelAssistant", Base)

local World = require "../base/world"
local Rating = require "util/rating"


local TaskDuelAssistant = require "task/duelassistant"


function DuelAssistant:_stop()
	self._opponentHasBall = false
	self._closerThanOpp = false
	self._lastChippedHysteresis = false
	self._active = false
	self._lastTrue = nil
	self._duellingRobot = nil
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
	local sender, _ = next(self._inbox.defendedOpponent())
	if not sender and not self._lastTrue then
		return false
	end
	if sender then
		self._duellingRobot = sender
	end
	local rating = -1
	if self._duellingRobot then
		if self._duellingRobot.pos:distanceTo(World.Ball.pos) > 1 then
			self._active = false
			self._lastTrue = nil
			return false
		end
		rating = self:rateRobot(self._duellingRobot)
	end
	self._send.exclusiveRole("trainer", { duelAssistant = rating })
	
	local isDuelAssistant = (self._inbox.duelAssistant().trainer == self._robot)

	if not isDuelAssistant then
		self._lastTrue = nil
		self._active = false
	elseif self._lastTrue and (World.Time - self._lastTrue) <= 1 then
		self._active = true
	else
		self._lastTrue = World.Time
		self._active = true
	end

	return self._active
end


function DuelAssistant:_updateTask()
	return TaskDuelAssistant
end

return DuelAssistant
