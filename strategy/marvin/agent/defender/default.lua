local Base = require "agent/base/behavior"
local Default = Class("Agent.Defender.Default", Base)

local World = require "../base/world"
local CenterBack = require "task/centerback"


function Default:_stop()
	self._lastTarget = nil
end

function Default:check()
	return true
end

function Default:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	local target = role and role.name == "CenterBack" and role.params[1] or World.Ball
	local restart = target ~= self._lastTarget
	self._lastTarget = target

	return CenterBack, { target }, restart
end

return Default
