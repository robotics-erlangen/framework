local Base = require "agent/base/behaviour"
local CenterBack = (require "../base/class").new("Agent.Defender.CenterBack", Base)

local CenterBackTask = require "task/centerback"

function CenterBack:_check()
	local isCenterBack = self._trainerMessage.specialTask.centerBack == self._robot
	-- use current task if we're active
	local centerBack = self._task or CenterBackTask.create(self._robot)
	local centerBackRating = centerBack:rate(self._priorityMessages, self._notifications)
	return isCenterBack and Base.State.Active or Base.State.Inactive,
		{specialTask = { centerBack = centerBackRating } }
end

function CenterBack:_run()
	if not self._task then
		self._task = CenterBackTask.create(self._robot)
	end
end

return CenterBack
