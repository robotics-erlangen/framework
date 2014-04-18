local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)

local CenterBack = require "task/centerback"

function Default:check()
	return true
end

function Default:_updateTask()
	-- TODO consider something new (for example zonal defense)
	return CenterBack
end

return Default
