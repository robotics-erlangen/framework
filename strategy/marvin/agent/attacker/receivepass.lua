local Base = require "agent/base/behaviour"
local ReceivePass = (require "../base/class").new("Agent.Attacker.ReceivePass", Base)
local World = require "../base/world"
local Ball = require "observer/ball"

local ReceivePassTask = require "task/receivepass"

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
		end
		return Base.State.Active
	elseif self._catchingPass then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot)
				or World.Ball.speed:length() < Settings.slowBall then
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
		self._task = ReceivePassTask.create(self._robot)
	end
end

return ReceivePass
