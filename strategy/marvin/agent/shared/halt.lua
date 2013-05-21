local Base = require "agent/base/behaviour"
local Halt = (require "../base/class").new("Agent.Shared.Halt", Base)

local World = require "../base/world"
local HaltTask = require "task/halt"

function Halt:_check()
	return (World.RefereeState == "Halt") and Base.State.Active or Base.State.Inactive
end

function Halt:_run()
	if not self._task then
		self._task = HaltTask.create(self._robot)
	end
end

return Halt
