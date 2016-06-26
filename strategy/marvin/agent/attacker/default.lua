local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local Striker = require "task/striker"
local Ball = require "observer/ball"
local World = require "../base/world"
local debug = require "../base/debug"

local MAX_PASS_MSG_DELAY = 0.2
local MIN_DIST_FOR_POOL_CHANGE = 0.7

function Default:check()
	-- if there is a defender further away from the own goal than we are,
	-- request a pool change
	local ownGoal = World.Geometry.FriendlyGoal
	for defender, _ in ipairs(self._inbox.defenderFlag()) do
		if defender.pos:distanceTo(ownGoal) < self._robot.pos:distanceTo(ownGoal) and
				defender.pos:distanceTo(self._robot.pos) < MIN_DIST_FOR_POOL_CHANGE then
			self._send.poolChangeRequest("trainer")
		end
	end

	local passReceiver, _ = next(self._inbox.passPos())
	self._forceKeepingInPool = passReceiver == self._robot
	return true
end

function Default:_updateTask()
	return Striker
end

return Default
