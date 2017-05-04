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
	local _, passInfoTable = next(self._inbox.passInfo())
	if passInfoTable then
		for _, passInfo in ipairs(passInfoTable) do
			if passInfo.target == self._robot then
				self._forceKeepingInPool = true
				break
			end
		end
	end

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

	if assignment.mainAttacker then
		self:_applyForMainAttacker(nil, nil, 2)
	end

	return assignment.class, assignment.params, assignment.restart
end

return Move
