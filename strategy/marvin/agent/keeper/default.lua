local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Keeper.Default", Base)

local Keeper = require "task/keeper"

function Default:check()
	return true
end

function Default:updateTask()
	return Keeper
end

return Default
