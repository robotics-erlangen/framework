local Base = require "agent/base/behavior"
local Move = Class("Agent.Move.Move", Base)

function Move:_stop()
end

function Move:check()
	return self._inbox.moveAssignment().trainer ~= nil
end

function Move:_updateTask()
	local assignment = self._inbox.moveAssignment().trainer
	return assignment.class, assignment.params
end

return Move