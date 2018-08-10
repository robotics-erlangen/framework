let situation = {
	refereeState = "GameForce",
	gameStage = "NORMAL_FIRST_HALF",
	ball = { pos = Vector(1.01828,1.04611), speed = Vector(-7.3011e-15,4.162e-15) },
	blueGoalie = 0,
	blueRobots = {
		[0] = {
			pos = Vector(0.0348015,2.90602),
			dir = Vector.fromAngle(-1.34458),
			speed = Vector(-1.20375e-07,-7.21853e-06),
			angularSpeed = Vector.fromAngle(-3.26864e-06)
		},
		[1] = {
		//	task = ShootGoal,
			pos = Vector(1.03088,1.29415),
			dir = Vector.fromAngle(-1.78715),
			speed = Vector(3.23482e-06,3.85203e-06),
			angularSpeed = Vector.fromAngle(3.95449e-06)
		},
	},
	yellowGoalie = 2,
	yellowRobots = {
		[2] = {
			pos = Vector(0.00901738,-2.86074),
			dir = Vector.fromAngle(1.18577),
			speed = Vector(-8.89956e-18,3.24177e-15),
			angularSpeed = Vector.fromAngle(1.48397e-15)
		},
		[3] = {
			pos = Vector(1.04175,0.750497),
			dir = Vector.fromAngle(1.53592),
			speed = Vector(-1.59841e-15,9.66132e-16),
			angularSpeed = Vector.fromAngle(-3.71304e-16)
		},
	},
}

return situation
