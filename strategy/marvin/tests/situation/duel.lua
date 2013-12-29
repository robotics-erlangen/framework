local situation = {
	refereeState = "GameForce",
	gameStage = "SecondHalf",
	ballPos = Vector.create(0,0),
	friendlyRobots = {
		{ pos = Vector.create(0,-0.3), dir = -math.pi*1.5 },
		{ pos = Vector.create(0,-1.3), dir = -math.pi*1.5 },
	},
	opponentRobots = {
		{ pos = Vector.create(0,0.3), dir = math.pi*1.5 },
		{ pos = Vector.create(0,1.3), dir = math.pi*1.5 },
	}
}

return situation