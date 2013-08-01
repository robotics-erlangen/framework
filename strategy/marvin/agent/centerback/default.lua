local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)

local CenterBack = require "task/centerback"

function Default:check()
	-- Stop from Referee is ignored as there's no valid ball position
	-- that would interfere with the centerback
	return true
end

function Default:_updateTask()
	return CenterBack
end

return Default
