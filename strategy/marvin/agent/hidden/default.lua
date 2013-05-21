local Base = require "agent/base/behaviour"
local Default = (require "../base/class").new("Agent.Hidden.Default", Base)
local World = require "../base/world"

local RescueRobot = require "task/rescuerobot"

function Default:_check()
	return Base.State.Active
end

function Default:_run()
	if not self._task then
		self._task = RescueRobot.create(self._robot)
	end
end

return Default
