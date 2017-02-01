local Base = require "agent/base/behavior"
local Default = Class("Agent.Defender.Default", Base)

local World = require "../base/world"
local CenterBack = require "task/centerback"


function Default:_stop()
	self._roleParams = nil
	self._restartTask = false
end

function Default:check()
	self._restartTask = false
	local role = self._inbox.roleAssignment().trainer
	if not role and self._roleParams then
		self._restartTask = true
		self._roleParams = nil
	elseif role and role.name == "CenterBack" and role.params ~= self._roleParams then
		self._restartTask = true
		self._roleParams = role.params
	end
	return true
end

function Default:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "CenterBack" then
		return CenterBack, { role.params }, self._restartTask
	else
		return CenterBack, { World.Ball }, self._restartTask
	end
end

return Default
