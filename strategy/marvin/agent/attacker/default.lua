local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local World = require "../base/world"
local AcceptPass = require "task/acceptpass"
local Striker = require "task/striker"
local Attack = require "util/attack"

local MIN_DIST_FOR_POOL_CHANGE = 0.7

function Default:_stop()
	self._acceptingPass = -math.huge
end

function Default:check()
	local _, passInfo = next(self._inbox.passInfo())
	self._forceKeepingInPool = passInfo and passInfo.target == self._robot

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
	local  _, passInfo = next(self._inbox.passInfo())
	if Attack.checkPassInfo(self._robot, passInfo) then
		self._acceptingPass = World.Time
	end

	return passInfo and World.Time - self._acceptingPass < 0.5 and AcceptPass or Striker
end

return Default
