local Base = require "agent/base/behavior"
local PassTiming = Class("Agent.Attacker.PassTiming", Base)

local debug	 = require "../base/debug"
local World = require "../base/world"
local Physics = require "observer/physics"
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

	if lastIncomingPassInfoPos then
		local robotTimeToPassPos = Physics.robotTimeToPos(self._robot, lastIncomingPassInfoPos, Vector(0,0))
		local ballTimeToPassPos = Physics.ballTravelTime(World.Ball, World.Ball.pos:distanceTo(lastIncomingPassInfoPos))
		if robotTimeToPassPos + 0.035 <= ballTimeToPassPos then
			if not Attack.checkPassInfos(self._robot, lastIncomingPassInfo) then
				debug.set("PassTiming/robotTime", robotTimeToPassPos)
				debug.set("PassTiming/ballTime", ballTimeToPassPos)
				return true
			end
		end
	end

	return false
end

function PassTiming:_updateTask()
	return MoveToPos, {self._robot.pos}
end

return PassTiming
