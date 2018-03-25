local Base = require "agent/base/behavior"
local Piggy = Class("Agent.Defender.Piggy", Base)

local debug = require "../base/debug"

-- TODO use interceptPass as soon as it works
--local InterceptPass = require "task/defender/interceptpass"

local PiggyTask = require "task/defender/piggy"


function Piggy:_stop()
	self._opp = nil
end

function Piggy:check()
	local role = self._inbox.roleAssignment().trainer
	return role and role.name == "Piggy"
end

function Piggy:_updateTask()
	local newOpp = self._inbox.roleAssignment().trainer.params[1]
	local restartTask = newOpp ~= self._opp
	self._opp = newOpp

	debug.set("target", self._opp.id)

	return PiggyTask, { self._opp }, restartTask
end

return Piggy