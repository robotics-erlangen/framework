local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local World = require "../base/world"
local AcceptPass = require "task/acceptpass"
local Striker = require "task/striker"
local Attack = require "util/attack"

local MIN_DIST_FOR_POOL_CHANGE = 0.7

function Default:_stop()
	self._acceptingPass = false
	self._forceKeepingInPool = false
end

function Default:check()
	local _, passInfoTable = next(self._inbox.passInfo())
	if passInfoTable then
		for _, passInfo in pairs(passInfoTable) do
			if passInfo and passInfo.target == self._robot then
				self._forceKeepingInPool = true
			end
		end
	end

	-- if there is a defender further away from the own goal than we are,
	-- request a pool change
	if not self._forceKeepingInPool then
		local ownGoal = World.Geometry.FriendlyGoal
		for defender, _ in ipairs(self._inbox.defenderFlag()) do
			if defender.pos:distanceTo(ownGoal) < self._robot.pos:distanceTo(ownGoal) and
					defender.pos:distanceTo(self._robot.pos) < MIN_DIST_FOR_POOL_CHANGE then
				self._send.poolChangeRequest("trainer", "defender")
			end
		end
	end

	return true
end

function Default:_updateTask()
	local _, passInfoTable = next(self._inbox.passInfo())
	self._acceptingPass = Attack.checkPassInfos(self._robot, passInfoTable, self._acceptingPass)

	return self._acceptingPass and AcceptPass or Striker
end

return Default
