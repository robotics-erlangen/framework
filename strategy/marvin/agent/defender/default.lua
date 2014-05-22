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
	local futureBall = {["pos"] = Goal.predictShot()}
	if role and role.name == "CenterBack" then
		return CenterBack, {futureBall}
	else
		-- TODO consider something new (for example zonal defense)
		return CenterBack, {futureBall}
	end
end

return Default
