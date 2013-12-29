local World = require "../base/world"
local Ball = require "observer/ball"
local shotObserved = false
local startTime
local situation = {
	refereeState = "GameForce",
	gameStage = "SecondHalf",
	ballPos = Vector.create(-0.3,1),
	friendlyRobots = {
		{ pos = Vector.create(0.3,0.2), dir = -math.pi*1.5 },
	},
	opponentRobots = {},
	observe = function()
		startTime = startTime or World.Time
		local timeDiff = World.Time - startTime
		if Ball.isShot() and not shotObserved then
			log("Ball shot after " .. timeDiff .. " seconds")
			shotObserved = true
		end
	end
}

return situation