local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Attacker.Default", Base)

local Assistant = require "task/assistant"

function Default:check()
	return true
end

function Default:_updateTask()
	return Assistant
end

return Default
