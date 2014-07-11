local Base = require "agent/base/behavior"
local ManMark = (require "../base/class").new("Agent.Defender.ManMark", Base)

local ManMarkTask = require "task/manmark"
local CenterBack = require "task/centerback"
local Field = require "util/field"
local Defense = require "util/defense"
local Class = require "../base/class"
local debug = require "../base/debug"
local vis = require "../base/vis"

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
	debug.set("target", self._opp)
	local dest = Defense.manMarkPos(self._opp)
	vis.addCircle("a/d/manmark: Target", dest, 0.1, vis.colors.red)

	local markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, self._opp.radius)
	local oppDefenseDist = Field.distanceToFriendlyDefenseArea(self._opp.pos, self._opp.radius)

	local markingPosNearLow, markingPosNearHigh = 2*self._robot.radius, 3*self._robot.radius
	local markingPosThreshold = (self._task and Class.instanceOf(self._task, CenterBack)) and markingPosNearHigh or markingPosNearLow
	local oppNearLow, oppNearHigh = 5*self._robot.radius, 6*self._robot.radius
	local oppThreshold = (self._task and Class.instanceOf(self._task, CenterBack)) and oppNearHigh or oppNearLow
	if oppDefenseDist == 0 -- opponent is in defense area
		or (oppDefenseDist < oppThreshold and markingPosDefenseDist < markingPosThreshold)
	then
		return CenterBack, { self._opp }
	else
		return ManMarkTask, { self._opp }
	end
end

return ManMark
