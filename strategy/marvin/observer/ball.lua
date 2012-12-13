local Ball = {} 

-- TODO: who is the first at the ball

local World = require "../base/world"
local Settings = require "settings"


local lastBallOwner

--- Returns the ballie that is either a friendly or an opponent robot 
function Ball.ballOwner()
	-- tests if the current ball owner still got the ball
	if lastBallOwner then
		local distSq = (lastBallOwner.pos - World.Ball.pos):lengthSq()
		if distSq > (Settings.ballOwnDistance + Settings.ballOwnHysteresis)^2 then
			lastBallOwner = nil
		end
	end
	-- searches for a new ball owner
	if not lastBallOwner then
		local minDistSq = math.huge
		for _,r in World.Robots do
			local distSq = (r.pos - World.Ball.pos):lengthSq()
			if distSq < minDistSq and distSq <= Settings.ballOwnDistance^2 then
				minDistSq = distSq
				lastBallOwner = r
			end
		end
	end
	return lastBallOwner
end



--- Calculates how long the ball will take to travel the given distance
-- @param v - the initial speed
-- @param distance number - the distance
function Ball.ballRollTime(v, distance)
	local a = Constants.ballDeceleration
	local discriminant = v*v + 2*a*distance
	if discriminant < 0 then -- should never happen
		error("Observer.Shoot.ballRollTime: invalid distance")
		return math.huge
	end
	local discriminantRoot = math.sqrt(discriminant)
	local t1 = (-v + discriminantRoot)/(2*a)
	local t2 = (-v - discriminantRoot)/(2*a)
	if t1 >= 0 then
		return t1
	else if t2 >= 0 then
		return t2
	else
		return math.huge
	end
end


--- Predicts the position of the ball at a given time
-- @param t number - the time difference
function Ball.atTime(t)
	-- code copy-pasted from wopr/prediction/ball

	local ballAt = function (t)
		-- p_b(t) = p_b + v_b(t0) * t + a_b(t0) * t^2/2
		return World.Ball.pos + World.Ball.speed * t + World.Ball.speed:normalized() * World.Ball.deceleration * (t^2/2)
	end
	
	local predicted -- = { radius = World.Ball.radius, visible = World.Ball.visible }
	if t > World.Ball.brakeTime then -- ball won't move anymore after it has stopped
		predicted.pos = ballAt(World.Ball.brakeTime)
		predicted.speed = Vector.create(0, 0)
		predicted.brakeTime = 0
	else
		predicted.pos = ballAt(t)
		predicted.speed = World.Ball.speed + World.Ball.speed:normalized() * World.Ball.deceleration * t
		predicted.brakeTime = World.Ball.brakeTime - t
	end
	predicted.deceleration = World.Ball.deceleration
	
	-- limit ball position to field, keeps reachBallPos from timing out
	-- makes even much more sense, as the ball can only be catched inside the field
	predicted.pos = util.limitToField(predicted.pos, World.Geometry.BoundaryWidth - 0.09) -- FIXME magic constant, robot radius
	
	return predicted
end


return Ball