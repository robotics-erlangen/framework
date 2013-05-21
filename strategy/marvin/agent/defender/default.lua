local Base = require "agent/base/behaviour"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)

local ManMark = require "task/manmark"

function Default:_check()
	return Base.State.Active
end

function Default:_run()
	if not self._task then
		self._task = ManMark.create(self._robot)
	end
end

return Default
