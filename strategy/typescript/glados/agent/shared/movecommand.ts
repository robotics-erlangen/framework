let Base = require "agent/base/behavior"
let MoveCommand = Class("Agent.Shared.MoveCommand", Base)

let World = require "../base/world"
let MoveToPos = require "task/shared/movetopos"


function MoveCommand:check () {
	return self._robot.moveCommand != nil  &&  not World.IsSimulated
}

function MoveCommand:_updateTask () {
	return MoveToPos, {self._robot.moveCommand.pos, nil, nil, nil, true}, true
}

return MoveCommand
