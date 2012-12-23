local Ball = {} 

-- TODO: who is the first at the ball

local Cache = require "../base/cache"
local World = require "../base/world"
local Settings = require "settings"
local Field = require "util/field"


local lastBallOwner

--- Returns the ballie that is either a friendly or an opponent robot 
function Ball.ballOwner()
	-- tests if the current ball owner still got the ball
	if lastBallOwner then
		local dist = lastBallOwner.pos:distanceTo(World.Ball.pos)
		if dist > Settings.ballOwnDistance + Settings.ballOwnHysteresis then
			lastBallOwner = nil
		end
	end
	-- searches for a new ball owner
	if not lastBallOwner then
		local minDist = math.huge
		for _,r in World.Robots do
			local dist = r.pos:distanceTo(World.Ball.pos)
			if dist < minDist and dist <= Settings.ballOwnDistance then
				minDist = dist
				lastBallOwner = r
			end
		end
	end
	return lastBallOwner
end
Ball.ballOwner = Cache.forFrame(Ball.ballOwner)


--- Calculates how long the ball will take to travel the given distance. This function assumes that the ball is still moving after the given distance!
-- @param v number - the initial speed
-- @param distance number - the distance
-- @return number - time the ball need to roll distance
function Ball.ballRollTime(v, distance)
	assert(v >= 0 and distance >=0, "v and distance must be positive")
	--distance = v*t + a/2*t^2
	local a = Constants.ballDeceleration
	local discriminant = v*v + 2*a*distance
	assert(discriminant >= 0, "Observer.Shoot.ballRollTime: unreachable distance")
	
	local discriminantRoot = math.sqrt(discriminant)
	return (-v + discriminantRoot)/(2*a)
end


--- Predicts the ball after a given time interval.
-- Assumes linear ball movement and linear deceleration
-- @param t number - time in seconds
-- @param ball Ball - defaults to World.Ball
-- @return Ball - predicted Ball-like table
function Ball.atTime(t, ball)
	ball = ball or World.Ball
	
	local ballAt = function (t)
		-- p_b(t) = p_b + v_b(t0) * t + a_b(t0) * t^2/2
		return ball.pos + ball.speed * t + ball.deceleration * (t^2/2) -- (8)
	end
	
	local predicted = { radius = ball.radius }
	if t > ball.brakeTime then -- ball won't move anymore after it has stopped
		predicted.pos = ballAt(ball.brakeTime)
		predicted.speed = Vector.create(0, 0)
		predicted.brakeTime = 0
	else
		predicted.pos = ballAt(t)
		predicted.speed = ball.speed + ball.deceleration * t
		predicted.brakeTime = ball.brakeTime - t
	end
	predicted.deceleration = ball.deceleration
	
	-- limit ball position to field, keeps reachBallPos from timing out
	-- makes even much more sense, as the ball can only be catched inside the field
	predicted.pos = Field.limitToField(predicted.pos, World.Geometry.BoundaryWidth)
	
	return predicted
end

return Ball
