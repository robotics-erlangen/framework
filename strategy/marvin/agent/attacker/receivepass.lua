local Base = require "agent/base/behaviour"
local ReceivePass = (require "../base/class").new("Agent.Attacker.ReceivePass", Base)
local World = require "../base/world"
local Class = require "../base/class"

local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local Referee = require "util/referee"

local PassReceiver = require "task/passreceiver"
local PassTarget = require "task/passtarget"

-- the agent can become passReceiver if the last passTarget notification
-- isn't older than this timeout
local passTargetTimeout = 0.2

function ReceivePass:_check()
	for robot, msg in pairs(self._messages) do
		if msg.task.passTarget == self._robot then
			self._targetTimer = World.Time
			break
		end
	end

	if self._catchingPass then
		-- abort if someone has the ball, the ball is slow or the game is stopped
		if Ball.opponentBallOwner() or Ball.friendlyBallOwner() or World.Ball.speed:length() < Settings.slowBall
				or Referee.isStopState() then
			return Base.State.Inactive
		end
		-- force being mainAttacker, suppress other passReceivers
		return Base.State.Active, { specialTask = { mainAttacker = 2, passReceiver = 2 } }, true

	elseif self._targetTimer and World.Time - self._targetTimer < passTargetTimeout then
		-- apply for becoming pass receiver
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
		local passReceiverRating = Rating.timeToRating(timeToBall)
		message = { specialTask = { passReceiver = passReceiverRating } }

		local passReceiver = self._trainerMessage.specialTask.passReceiver
		local ballShooter = Ball.isShot()
		if (not passReceiver or passReceiver == self._robot) and ballShooter and ballShooter.isFriendly then
			self._catchingPass = true
		end
		return Base.State.Active, message, true
	end
	return Base.State.Inactive
end

function ReceivePass:_stop(isAborted)
	self._catchingPass = false
end

function ReceivePass:_run()
	if self._catchingPass then
		if not self._task or not Class.instanceOf(self._task, PassReceiver) then
			self._task = PassReceiver.create(self._robot)
		end
	else
		if not self._task or not Class.instanceOf(self._task, PassTarget) then
			self._task = PassTarget.create(self._robot)
		end
	end
end

return ReceivePass
