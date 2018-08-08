local Base = require "agent/base/behavior"
local ZoneDefense = Class("Agent.Defender.ZoneDefense", Base)

local BallEvadingMoveToPos = require "task/defender/ballevadingmovetopos"

function ZoneDefense:_stop()
	self._movePos = nil
end

function ZoneDefense:check()
	local role = self._inbox.roleAssignment().trainer
	return role and role.name == "ZoneDefense"
end

function ZoneDefense:_updateTask()
	local movePos = self._inbox.roleAssignment().trainer.params[1]
	local restartTask = movePos ~= self._movePos
	self._movePos = movePos

	return BallEvadingMoveToPos, {self._movePos, nil}, restartTask
end

return ZoneDefense
