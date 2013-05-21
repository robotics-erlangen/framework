local Base = require "agent/base/behaviour"
local Play = (require "../base/class").new("Agent.Shared.Play", Base)

function Play:_check()
	local play = self._trainerMessage.play
	return (play and play[self._robot]) and Base.State.Active or Base.State.Inactive
end

function Play:_run()
	self._task = self._trainerMessage.play[self._robot]
end

return Play
