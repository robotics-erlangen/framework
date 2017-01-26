local Base = require "agent/base/behavior"
local Move = Class("Agent.Attacker.Move", Base)
local debug = require "../base/debug"

function Move:_stop()
	if self._behavior then
		self._behavior:stop()
	end
	self._behavior = nil
end

function Move:_init()
	self._behavior = nil
end

function Move:check()
	return self._inbox.moveAssignment().trainer ~= nil
end

function Move:_updateTask()
	self._forceKeepingInPool = next(self._inbox.passInfo()) ~= nil

	local assignment = self._inbox.moveAssignment().trainer
	if assignment.behavior then
		if not self._behavior then
			self._behavior = assignment.behavior(self._agent)
			self._behavior:start()
		end
		debug.set("Move Behavior", Class.name(self._behavior, true))
		return self._behavior:_updateTask()
	end

	if self._behavior then
		self._behavior:stop()
		self._behavior = nil
	end

	return assignment.class, assignment.params, assignment.restart
end

return Move
