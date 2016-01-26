local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local Striker = require "task/striker"


function Default:check()
	self._forceKeepingInPool = next(self._inbox.passPos()) ~= nil
	return true
end

function Default:_updateTask()
	return Striker
end

return Default
