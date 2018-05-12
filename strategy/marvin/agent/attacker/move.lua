local Base = require "agent/base/behavior"
local Move = Class("Agent.Attacker.Move", Base)

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

	if assignment.mainAttacker then
		self:_applyForMainAttacker(nil, nil, 2)
	end
	if assignment.behavior then
		return self:runDeferredBehaviour(assignment.behavior)
	end

	return assignment.class, assignment.params, assignment.restart
end

return Move
