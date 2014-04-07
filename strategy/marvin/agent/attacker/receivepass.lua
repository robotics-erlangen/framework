local Base = require "agent/base/behavior"
local ReceivePass = (require "../base/class").new("Agent.Attacker.ReceivePass", Base)
local World = require "../base/world"
local Class = require "../base/class"

local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local Referee = require "../base/referee"

local PassReceiver = require "task/passreceiver"
local PassTarget = require "task/passtarget"

-- the agent can become passReceiver if the last passTarget notification
-- isn't older than this timeout
local passTargetTimeout = 0.2

function ReceivePass:_stop()
	self._catchingPass = false
	self._ballShooter = nil
	self._targetTimer = nil
end

function ReceivePass:_canCatchBall()
	local posOnLine = PassReceiver.catchPosition(self._robot)
	local distToPos = self._robot.pos:distanceTo(posOnLine)
	local ballTime = Ball.ballRollTime(World.Ball.speed:length(), World.Ball.pos:distanceTo(posOnLine))
	local robotTime = Robot.timeToPos(self._robot, posOnLine)
	return ballTime > robotTime
end


function ReceivePass:check()
	for _, _ in pairs(self._inbox.passSender()) do
		self._targetTimer = World.Time -- remember time of last pass message
		self._forceKeepingInPool = true
	end

	if self._catchingPass then
		local friendlyBallOwner = Ball.friendlyBallOwner()
		-- ignore the ball owner until the ball has moved away from it
		if friendlyBallOwner == self._ballShooter then
			friendlyBallOwner = nil
		else
			self._ballShooter = nil
		end
		-- abort if someone has the ball, the ball is slow or the game is stopped
		if Ball.opponentBallOwner() or friendlyBallOwner or World.Ball.speed:length() < Settings.slowBall
				or Referee.isStopState() then
			return false
		end

		-- make sure that nobody else becomes passReceiver or mainAttacker
		self._send("trainer").specialRole({ passReceiver = 2 })
		self._send("trainer").specialRole({ mainAttacker = 2 })
		return true
	elseif self._targetTimer and World.Time - self._targetTimer < passTargetTimeout then
		-- apply for becoming pass receiver
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
		local passReceiverRating = Rating.timeToRating(timeToBall)
		self._send("trainer").specialRole({ passReceiver = passReceiverRating })

		local passReceiver = self._inbox.passReceiver().trainer
		local ballShooter = Ball.isShot()
		if (not passReceiver or passReceiver == self._robot) and ballShooter and ballShooter.isFriendly then
			self._catchingPass = true
			self._ballShooter = ballShooter
		end
		return self:_canCatchBall()
	end
	return false
end

function ReceivePass:_updateTask()
	if self._catchingPass then
		return PassReceiver
	else
		return PassTarget
	end
end

return ReceivePass
