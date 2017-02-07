local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local Striker = require "task/striker"
local World = require "../base/world"

local MIN_DIST_FOR_POOL_CHANGE = 0.7

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
	return Striker
end

return Default
