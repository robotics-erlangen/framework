import * as World from "base/world";
import * as Ball from "glados/observer/ball";


let situation = {
	refereeState = "GameForce",
	gameStage = "SecondHalf",
	ball = { pos = new Vector(-0.3,1), speed = new Vector(-7.3011e-15,4.162e-15) },
	blueGoalie = 1,
	blueRobots = {
		[0] = {
			pos = new Vector(0.3,0.2),
			dir = Vector.fromAngle(-Math.PI*1.5),
			speed = new Vector(-1.20375e-07,-7.21853e-06),
			angularSpeed = Vector.fromAngle(-3.26864e-06)
		},
	},
	yellowGoalie = 0
}

let shotObserved = false
let startTime
situation.observe = function()
	startTime = startTime || World.Time
	let timeDiff = World.Time - startTime
	if (Ball.isShot() && not shotObserved) {
		log("Ball shot after "  +  timeDiff  +  " seconds")
		shotObserved = true
	}
}

return situation
