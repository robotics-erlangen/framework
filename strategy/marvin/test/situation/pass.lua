local situation = {
	refereeState = "GameForce",
	gameStage = "NORMAL_FIRST_HALF",
	ball = { pos = Vector.create(-0.614928,-1.92774), speed = Vector.create(-3.60174e-15,3.09447e-15) },
	blueGoalie = 0,
	blueRobots = {
		[0] = {
			pos = Vector.create(-0.006463,2.906),
			dir = Vector.fromAngle(-1.62086),
			speed = Vector.create(2.55756e-18,-1.57318e-15),
			angularSpeed = Vector.fromAngle(-7.76672e-17)
		},
		[4] = {
			pos = Vector.create(0.1712,-1.39225),
			dir = Vector.fromAngle(-1.7018),
			speed = Vector.create(-1.10186e-16,-1.24766e-15),
			angularSpeed = Vector.fromAngle(7.85284e-17)
		},
		[5] = {
			pos = Vector.create(-0.751487,-2.0683),
			dir = Vector.fromAngle(1.22244),
			speed = Vector.create(1.88834e-16,9.46867e-16),
			angularSpeed = Vector.fromAngle(-7.79123e-17)
		},
	},
	yellowGoalie = 1,
	yellowRobots = {
		[1] = {
			pos = Vector.create(-0.158374,-2.93461),
			dir = Vector.fromAngle(-0.000393077),
			speed = Vector.create(-1.66845e-16,1.13598e-15),
			angularSpeed = Vector.fromAngle(4.73428e-20)
		},
		[2] = {
			pos = Vector.create(-0.631342,-2.25583),
			dir = Vector.fromAngle(0.0387517),
			speed = Vector.create(-1.14118e-16,1.22756e-15),
			angularSpeed = Vector.fromAngle(4.77171e-18)
		},
		[6] = {
			pos = Vector.create(-0.46648,-2.21359),
			dir = Vector.fromAngle(-0.0340871),
			speed = Vector.create(-1.11692e-16,-6.72946e-16),
			angularSpeed = Vector.fromAngle(1.7778e-08)
		},
		[7] = {
			pos = Vector.create(-0.299132,-2.17667),
			dir = Vector.fromAngle(-0.128825),
			speed = Vector.create(-2.93795e-16,1.05312e-15),
			angularSpeed = Vector.fromAngle(-1.90548e-17)
		},
	},
}

return situation
