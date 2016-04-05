local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local Striker = require "task/striker"
local Ball = require "observer/ball"
local World = require "../base/world"
local debug = require "../base/debug"

local MAX_PASS_MSG_DELAY = 0.2

function Default:check()
	self._forceKeepingInPool = next(self._inbox.passPos()) ~= nil
	local messageDetected = false
	for _, msg in pairs(self._inbox.passPos()) do
		if msg.robot == self._robot then
			self._agent.lastIncomingPassTime = World.Time
		else -- pass to other robot
			self._agent.lastIncomingPassTime = 0
		end
	end

	debug.set("timediff", World.Time-self._agent.lastIncomingPassTime)
	if Ball.isShot() and World.Time-self._agent.lastIncomingPassTime < MAX_PASS_MSG_DELAY then
		debug.set("applying", true)
		self:_applyForMainAttacker(nil, nil, 2)
	end

	return true
end

function Default:_updateTask()
	return Striker
end

return Default
