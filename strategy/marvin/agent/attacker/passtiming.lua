local Base = require "agent/base/behavior"
local PassTiming = Class("Agent.Attacker.PassTiming", Base)

local Sidestep = require "task/sidestep"
local Attack = require "util/attack"

function PassTiming:check()
	local lastIncomingPassInfo = Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())

	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	local lastIncomingPassInfoPos = nil

	if lastIncomingPassInfo then
		lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	end

	if lastIncomingPassInfoPos and not Attack.checkPassInfos(self._robot, {lastIncomingPassInfo}, true) then
		return true
	end

	return false
end

function PassTiming:_updateTask()
	return Sidestep, {Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())}
end

return PassTiming
