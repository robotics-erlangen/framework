local Base = require "agent/base/behavior"
local MoveCommand = Class("Agent.Shared.MoveCommand", Base)

local MoveToPos = require "task/movetopos"


function MoveCommand:check()
	return self._robot.moveCommand ~= nil
end

function MoveCommand:_updateTask()
	return MoveToPos, {self._robot.moveCommand, nil, nil, nil, true}, true
end

return MoveCommand
