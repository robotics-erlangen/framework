local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)


local World = require "../base/world"
local CenterBack = require "task/centerback"
local Goal = require "observer/goal"

function Default:check()
	return true
end

function Default:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "CenterBack" then
		return CenterBack, {World.Ball}
	else
		-- TODO consider something new (for example zonal defense)
		return CenterBack, {World.Ball}
	end
end

return Default
