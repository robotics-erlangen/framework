local Base = require "agent/base/behavior"
local ZoneDefense = Class("Agent.Defender.ZoneDefense", Base)

local BallEvadingMoveToPos = require "task/ballevadingmovetopos"

function ZoneDefense:_stop()
	self._movePos = nil
end

function ZoneDefense:check()
	local role = self._inbox.roleAssignment().trainer
	return role and role.name == "ZoneDefense"
end

function ZoneDefense:_updateTask()
	local roleParam = self._inbox.roleAssignment().trainer.params
	local restartTask = roleParam ~= self._movePos
	self._movePos = roleParam
	return BallEvadingMoveToPos, {self._movePos, nil}, restartTask
end

return ZoneDefense
