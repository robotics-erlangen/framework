local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Manual.Default", Base)

local Manual = require "task/manual"

function Default:check()
	return true
end

function Default:_updateTask()
	return Manual
end

return Default
