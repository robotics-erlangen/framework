local Base = require "agent/base/behaviour"
local Default = (require "../base/class").new("Agent.Keeper.Default", Base)

local Keeper = require "task/keeper"

function Default:_check()
	return Base.State.Active
end

function Default:_run()
	if not self._task then
		self._task = Keeper.create(self._robot)
	end
end

return Default
