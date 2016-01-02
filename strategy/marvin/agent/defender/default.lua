local Base = require "agent/base/behavior"
local Default = Class("Agent.Defender.Default", Base)

local World = require "../base/world"
local Goal = require "observer/goal"
local CenterBack = require "task/centerback"


function Default:_stop()
	self._roleParams = nil
end

function Default:check()
	local role = self._inbox.roleAssignment().trainer
	if not role and self._roleParams then
		self._task = nil -- force creation of new task
		self._roleParams = nil
	elseif role and role.name == "CenterBack" and role.params ~= self._roleParams then
		self._task = nil -- force creation of new task
		self._roleParams = role.params
	end
	return true
end

function Default:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "CenterBack" then
		return CenterBack, { role.params }
	else
		return CenterBack, { World.Ball }
	end
end

return Default
