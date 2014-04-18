local Base = require "agent/base/behavior"
local CenterBack = (require "../base/class").new("Agent.Defender.CenterBack", Base)

local CenterBackTask = require "task/centerback"

function CenterBack:check()
	-- Stop from Referee is ignored as there's no valid ball position
	-- that would interfere with the centerback
	local role = self._inbox.roleAssignment().trainer
	return role and role.name == "CenterBack"
end

function CenterBack:_updateTask()
	return CenterBackTask
end

return CenterBack
