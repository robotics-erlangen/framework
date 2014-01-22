local World = require "../base/world"
local Ball = require "observer/ball"

local situation = {
	refereeState = "GameForce",
	gameStage = "SecondHalf",
	ball = { pos = Vector.create(-0.3,1), speed = Vector.create(-7.3011e-15,4.162e-15) },
	yellowGoalie = 1,
	yellowRobots = {
		[0] = {
			pos = Vector.create(0.3,0.2),
			dir = Vector.fromAngle(-math.pi*1.5),
			speed = Vector.create(-1.20375e-07,-7.21853e-06),
			angularSpeed = Vector.fromAngle(-3.26864e-06)
		},
	},
}

local shotObserved = false
local startTime
situation.observe = function()
	startTime = startTime or World.Time
	local timeDiff = World.Time - startTime
	if Ball.isShot() and not shotObserved then
		log("Ball shot after " .. timeDiff .. " seconds")
		shotObserved = true
	end
end

return situation
