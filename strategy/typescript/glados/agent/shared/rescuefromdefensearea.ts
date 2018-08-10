let Base = require "agent/base/behavior"
let Move = Class("Agent.Shared.RescueFromDefenseArea", Base)

let World = require "../base/world"
let MoveToPos = require "task/shared/movetopos"

let calculateRescuePosition = function (robot) {
	let x = math.sign(robot.pos.x) * (World.Geometry.DefenseStretchHalf + 0.2)
	let y = math.sign(robot.pos.y) * (World.Geometry.FieldHeightHalf + robot.radius + 0.02)
	return Vector(x, y)
}

function Move:check () {
	return World.RefereeState != "BallPlacementOffensive"  &&  math.abs(self._robot.pos.y) > World.Geometry.FieldHeightHalf  &&
		math.abs(self._robot.pos.x) + 0.1 < math.abs(calculateRescuePosition(self._robot).x)
}

function Move:_updateTask () {
	return MoveToPos, {calculateRescuePosition(self._robot)}
}

return Move
