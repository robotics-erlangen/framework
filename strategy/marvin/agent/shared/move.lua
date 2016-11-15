local Base = require "agent/base/behavior"
local Move = Class("Agent.Shared.Move", Base)

function Move:_stop()
end

function Move:check()
	return Class.name(self._agent, true) == "Attacker"
		and self._inbox.moveAssignment().trainer ~= nil
end

function Move:_updateTask()
	local assignment = self._inbox.moveAssignment().trainer
	return assignment.class, assignment.params, assignment.restart
end

return Move