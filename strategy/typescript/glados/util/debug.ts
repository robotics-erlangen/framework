let Debug = {}


let DebugCommands = require "+/base/debugcommands"
import * as World from "base/world";

/// moves the ball to a given position, using teleportation or ballPlacement.
//@name moveBall
//@param state String - the RefereeState that should be given as soon as the ball reaches the position
//@param target Vector - the position where the ball should be, defaults to World.BallPlacementPos to allow subsequent calls to this function without changing the target
//@param distanceTo number - the distance that is tolerable when placeing the ball, defaults to 0.05 [m]
//@param speed number - the speed that is tolerable when placeing the ball, defaults to 0.05 [m/s]
//@param offensive bool - if the placement should be given to the own team, defaults to false
//This function should be called every frame until the refereeState changes to state
function Debug.moveBall (state, target, distanceTo, speed, offensive) {
	distanceTo = distanceTo || 0.05
	speed = speed || 0.05
	if (not amun.isDebug) {
		error("moveBall is only available during debug")
	}
	let placementState = "BallPlacement"
	if (offensive) {
		placementState = placementState  +  "Offensive"
	} else {
		placementState = placementState  +  "Defensive"
	}
	if (World.IsSimulated) {
		let ball = {pos: target, speed = new Vector(0,0)}
		DebugCommands.moveObjects(ball)
		DebugCommands.sendRefereeCommand(state)
	} else if (World.RefereeState != placementState || (target && target.distanceToSq(World.BallPlacementPos) < 0.05 * 0.05)) {
		assert(target, "moveBall needs a target in the first run")
		DebugCommands.sendRefereeCommand(placementState, undefined, undefined, undefined, target)
	}
	target = target || World.BallPlacementPos
	if (World.Ball.pos.distanceToSq(target) < distanceTo * distanceTo && World.Ball.speed.lengthSq() < speed * speed) {
		DebugCommands.sendRefereeCommand(state)
	}
}

return Debug
