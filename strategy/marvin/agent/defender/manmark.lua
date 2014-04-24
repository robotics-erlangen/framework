local Base = require "agent/base/behavior"
local ManMark = (require "../base/class").new("Agent.Defender.ManMark", Base)

local ManMarkTask = require "task/manmark"
local CenterBack = require "task/centerback"
local Field = require "util/field"
local Class = require "../base/class"

function ManMark:_stop()
	self._opp = nil
end

function ManMark:check()
	local role = self._inbox.roleAssignment().trainer
	if role and role.name == "ManMark" then
		if self._inbox.roleAssignment().trainer.params ~= self._opp then
			self._task = nil -- force creation of new task
			self._opp = self._inbox.roleAssignment().trainer.params
		end
		return true
	end
	return false
end

function ManMark:_updateTask()
	local oppDist = Field.distanceToFriendlyDefenseArea(self._opp.pos, self._opp.radius)
	local nearLow, nearHigh = 4*self._robot.radius, 5*self._robot.radius
	local threshold = (self._task and Class.instanceOf(self._task, CenterBack)) and nearHigh or nearLow
	if oppDist < threshold and self._robot.pos:distanceTo(self._opp.pos) < threshold then
		return CenterBack, { self._opp }
	else
		return ManMarkTask, { self._opp }		
	end
end

return ManMark
