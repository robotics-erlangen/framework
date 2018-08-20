import {Behavior} from "glados/agent/base/behavior";
let Move = Class("Agent.Shared.RescueFromDefenseArea", Base)

import * as World from "base/world";
import {MoveToPos} from "glados/task/shared/movetopos";

let calculateRescuePosition = function (robot) {
	let x = MathUtil.sign(robot.pos.x) * (World.Geometry.DefenseStretchHalf + 0.2)
	let y = MathUtil.sign(robot.pos.y) * (World.Geometry.FieldHeightHalf + robot.radius + 0.02)
	return new Vector(x, y)
}

function Move:check () {
	return World.RefereeState != "BallPlacementOffensive" && Math.abs(this._robot.pos.y) > World.Geometry.FieldHeightHalf  &&
		Math.abs(this._robot.pos.x) + 0.1 < Math.abs(calculateRescuePosition(this._robot).x)
}

function Move:_updateTask () {
	return MoveToPos, {calculateRescuePosition(this._robot)}
}

return Move
