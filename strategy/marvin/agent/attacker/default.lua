local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local Striker = require "task/striker"
local Ball = require "observer/ball"
local World = require "../base/world"
local debug = require "../base/debug"

local MAX_PASS_MSG_DELAY = 0.2

function Default:check()
	self._forceKeepingInPool = next(self._inbox.passPos()) ~= nil
	return true
end

function Default:_updateTask()
	return Striker
end

return Default
