local Ball = {} 

-- TODO: who is the first at the ball

local Constants = require "../base/constants"
local Cache = require "../base/cache"
local World = require "../base/world"
local Settings = require "settings"
local Field = require "util/field"
local geom = require "../base/geom"


local lastBallOwner

--- Returns the ballie that is either a friendly or an opponent robot 
function Ball.ballOwner()
	--search robot with min dist to ball
	local minDist = math.huge
	local ballOwner = nil
	for _,r in pairs(World.Robots) do
		local dribblerPos = r.pos + Vector.fromAngle(r.dir):scaleLength(r.shootRadius)
		local dist = dribblerPos:distanceTo(World.Ball.pos)
		if dist < minDist and dist <= Settings.ballOwnDistance then
			minDist = dist
			ballOwner = r
		end
	end

	-- calculate dist from lastBallOwner to ball
	local lastDist = math.huge
	if lastBallOwner then
		local lastPos = lastBallOwner.pos + 
			Vector.fromAngle(lastBallOwner.dir):scaleLength(lastBallOwner.shootRadius)
		lastDist = lastPos:distanceTo(World.Ball.pos)
	end

	-- set new lastBallOwner or nil, if no robot is near ball
	if minDist < (lastDist - Settings.ballOwnHysteresis) or not ballOwner then
		lastBallOwner = ballOwner
	end

	return lastBallOwner
end
--Ball.ballOwner = Cache.forFrame(Ball.ballOwner)


--- Calculates how long the ball will take to travel the given distance. Return math.huge if the distance is unreachable.
-- @param v number - the initial speed
-- @param distance number - the distance
-- @return number - time the ball needs to roll distance
function Ball.ballRollTime(v, distance)
	assert(v >= 0 and distance >=0, "v and distance must be positive")
	--distance = v*t + a/2*t^2
	local acceleration = Constants.ballDeceleration
	local t = math.solveSq(acceleration * 0.5, v, -distance)
	return t or math.huge
end


local function ballAt(ball, t)
	-- p_b(t) = p_b + v_b(t0) * t + a_b(t0) * t^2/2
	return ball.pos + ball.speed * t + ball.deceleration * (t^2/2) -- (8)
end

--- Predicts the ball after a given time interval.
-- Assumes linear ball movement and linear deceleration
-- @param t number - time in seconds
-- @param ball Ball - defaults to World.Ball
-- @return Ball - predicted Ball-like table
function Ball.atTime(t, ball)
	ball = ball or World.Ball
	
	local predicted = { radius = ball.radius }
	if t > ball.brakeTime then -- ball won't move anymore after it has stopped
		predicted.pos = ballAt(ball, ball.brakeTime)
		predicted.speed = Vector.create(0, 0)
		predicted.brakeTime = 0
	else
		predicted.pos = ballAt(ball, t)
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
