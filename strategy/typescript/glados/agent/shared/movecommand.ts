let Base = require "agent/base/behavior"
let MoveCommand = Class("Agent.Shared.MoveCommand", Base)

import * as World from "base/world";
import {MoveToPos} from "glados/task/shared/movetopos";


function MoveCommand:check () {
	return this._robot.moveCommand != undefined && not World.IsSimulated
}

function MoveCommand:_updateTask () {
	return MoveToPos, {this._robot.moveCommand.pos, undefined, undefined, undefined, true}, true
}

return MoveCommand
