local Base = require "agent/base/behaviour"
local ReceivePass = (require "../base/class").new("Agent.Attacker.ReceivePass", Base)
local World = require "../base/world"
local Ball = require "observer/ball"

local PassReceiver = require "task/passreceiver"
local PassTarget = require "task/passtarget"

function ReceivePass:_init()
	self._catchingPass = false
end

function ReceivePass:_check()
	local isPassTarget = false
	for robot, msg in pairs(self._messages) do
		if msg.task.passTarget == self._robot then
			isPassTarget = true
			break
		end
	end

	if isPassTarget then
		if Ball.isShot() then
			self._catchingPass = true
			self._task = nil
		end
		return Base.State.Active
	elseif self._catchingPass then
		if Ball.opponentBallOwner() or Ball.friendlyBallOwner() then
			self._catchingPass = false
			return Base.State.Inactive
		end
		return Base.State.Active
	end

	return Base.State.Inactive
end

function ReceivePass:_abort()
	self._state = Base.State.Inactive
	self._catchingPass = false
end

function ReceivePass:_run()
	if not self._task then
		if self._catchingPass then
			self._task = PassReceiver.create(self._robot)
		else
			self._task = PassTarget.create(self._robot)
		end
	end
end

return ReceivePass
