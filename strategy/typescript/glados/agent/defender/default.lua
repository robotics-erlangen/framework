local Base = require "agent/base/behavior"
local Default = Class("Agent.Defender.Default", Base)

local CenterBack = require "task/defender/centerback"
local Defense = require "util/defense"


function Default:_stop()
	self._lastTarget = nil
	self._customBall = {}
end

function Default:check()
	return true
end

function Default:_updateTask()
	local role = self._inbox.roleAssignment().trainer
	local target = role and role.name == "CenterBack" and role.params or self._customBall
	local restart = target ~= self._lastTarget
	self._lastTarget = target

	if target == self._customBall then
		local fieldPos, fieldDir = Defense.calculateBallPositionField()
		self._customBall.pos = fieldPos
		self._customBall.dir = fieldDir
	end

	return CenterBack, { target }, restart
end

return Default
