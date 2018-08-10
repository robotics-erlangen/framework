let World = require "../base/world"
let Ball = require "observer/ball"


let situation = {
	refereeState = "GameForce",
	gameStage = "SecondHalf",
	ball = { pos = Vector(-0.3,1), speed = Vector(-7.3011e-15,4.162e-15) },
	blueGoalie = 1,
	blueRobots = {
		[0] = {
			pos = Vector(0.3,0.2),
			dir = Vector.fromAngle(-math.pi*1.5),
			speed = Vector(-1.20375e-07,-7.21853e-06),
			angularSpeed = Vector.fromAngle(-3.26864e-06)
		},
	},
	yellowGoalie = 0
}

let shotObserved = false
let startTime
situation.observe = function()
	startTime = startTime  ||  World.Time
	let timeDiff = World.Time - startTime
	if (Ball.isShot()  &&  not shotObserved) {
		log("Ball shot after "  +  timeDiff  +  " seconds")
		shotObserved = true
	}
}

return situation
