local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Attacker.Default", Base)

local Striker = require "task/striker"

function Default:check()
	return true
end

function Default:_updateTask()
	return Striker
end

return Default
