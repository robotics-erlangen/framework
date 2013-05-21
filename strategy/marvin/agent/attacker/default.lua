local Base = require "agent/base/behaviour"
local Default = (require "../base/class").new("Agent.Attacker.Default", Base)

local Assistant = require "task/assistant"

function Default:_check()
	return Base.State.Active
end

function Default:_run()
	if not self._task then
		self._task = Assistant.create(self._robot)
	end
end

return Default
