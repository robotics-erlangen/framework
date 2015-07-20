local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local Striker = require "task/striker"
local DirectPassTarget = require "task/directpasstarget"

function Default:check()
	self._forceKeepingInPool = next(self._inbox.passPos()) ~= nil
	return true
end

function Default:_updateTask()
	local _, passPos = next(self._inbox.passPos())
	if passPos and self._robot.pos:distanceTo(passPos) < 1 then
		return DirectPassTarget -- just hold position to receive the direct pass
	else
		return Striker
	end
end

return Default
