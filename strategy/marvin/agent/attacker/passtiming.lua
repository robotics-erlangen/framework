local Base = require "agent/base/behavior"
local PassTiming = Class("Agent.Attacker.PassTiming", Base)

local MoveToPos = require "task/movetopos"
local Attack = require "util/attack"

function PassTiming:check()
	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	local lastIncomingPassInfo = Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())
	local lastIncomingPassInfoPos = nil

	if lastIncomingPassInfo then
		lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	end

	if lastIncomingPassInfoPos and not Attack.checkPassInfos(self._robot, {lastIncomingPassInfo}) then
		return true
	end

	return false
end

function PassTiming:_updateTask()
	return MoveToPos, {self._robot.pos}
end

return PassTiming
