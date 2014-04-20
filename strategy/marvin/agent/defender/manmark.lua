local Base = require "agent/base/behavior"
local ManMark = (require "../base/class").new("Agent.Defender.ManMark", Base)

local ManMarkTask = require "task/manmark"

function ManMark:_stop()
	self._opp = nil
end

function ManMark:check()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "ManMark" then
		if self._inbox.roleAssignment().trainer.params ~= self._opp then
			self._task = nil -- force creation of new task
			self._opp = self._inbox.roleAssignment().trainer.params
		end
		return true
	end
	return false
end

function ManMark:_updateTask()
	return ManMarkTask, { self._opp }
end

return ManMark
