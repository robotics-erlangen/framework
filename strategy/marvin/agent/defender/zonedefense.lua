local Base = require "agent/base/behavior"
local ZoneDefense = Class("Agent.Defender.ZoneDefense", Base)

local World = require "../base/world"
local MoveToPos = require "task/movetopos"

function ZoneDefense:_stop()
	self._movePos = nil
end

function ZoneDefense:check()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "ZoneDefense" then
		if self._inbox.roleAssignment().trainer.params ~= self._movePos then
			self._task = nil -- force creation of new task
			self._movePos = self._inbox.roleAssignment().trainer.params
		end
		return true
	end
	return false
end

function ZoneDefense:_updateTask()
	return MoveToPos, {self._movePos, (World.Ball.pos - self._movePos):angle()}
end

return ZoneDefense