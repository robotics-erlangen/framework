local Base = require "agent/base/behavior"
local MoveCommand = Class("Agent.Shared.MoveCommand", Base)

local World = require "../base/world"
local MoveToPos = require "task/movetopos"


function MoveCommand:check()
	return self._robot.moveCommand ~= nil and not World.IsSimulated
end

function MoveCommand:_updateTask()
	return MoveToPos, {self._robot.moveCommand, nil, nil, nil, true}, true
end

return MoveCommand
