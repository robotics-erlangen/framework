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
		for _,r in pairs(World.Robots) do
			local dist = r.pos:distanceTo(World.Ball.pos)
			-- TODO: prefer robot facing the ball
			if dist < minDist and dist <= Settings.ballOwnDistance then
				minDist = dist
				lastBallOwner = r
			end
		end
	end
	return lastBallOwner
end
Ball.ballOwner = Cache.forFrame(Ball.ballOwner)


--- Calculates how long the ball will take to travel the given distance. Return math.huge if the distance is unreachable.
-- @param v number - the initial speed
-- @param distance number - the distance
-- @return number - time the ball needs to roll distance
function Ball.ballRollTime(v, distance)
	assert(v >= 0 and distance >=0, "v and distance must be positive")
	--distance = v*t + a/2*t^2
	local a = Constants.ballDeceleration
	local discriminant = v*v + 2*a*distance
	if discriminant < 0 then
		return math.huge
	end
	
	local discriminantRoot = math.sqrt(discriminant)
	return (-v + discriminantRoot)/(2*a)
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


--- Predicts the direction the ball will be shot into.
-- Checks for ball movement, opponents near the ball, tries to predict passes
-- @return Vector - origin of movement
-- @return Vector - ball movement direction and speed
function Ball.predictShot()
	local dir = World.Ball.speed -- Defend ball by default
	local pos = World.Ball.pos
	local isShot = false

	local ballOwner = Ball.ballOwner()
	if ballOwner and not ballOwner.isFriendly
			and dir:length() <= Settings.slowBall then
		-- if opponent is close to ball use its orientation
		dir = Vector.fromAngle(ballOwner.dir)
		dir = dir * Settings.slowBall * 0.8 -- scale length to disable pass prediction
	end
	
	if dir:length() > Settings.slowBall then
		local intersectGoal = geom.intersectLineLine(pos, dir, World.Geometry.FriendlyGoal, Vector.create(1, 0))
		-- FIXME as the ball is moving also use pass check if it slightly misses the goal
		-- TODO check whether an opponent robot may deflect the ball inside the keeper area?
		-- check if there's a robot which may recieve the pass
		if (intersectGoal and math.abs(intersectGoal.x) > World.Geometry.FieldWidthHalf) or dir.y > 0 then
			local target = nil
			local targetDist = math.huge
			for _, robot in pairs(World.OpponentRobots) do
				-- FIXME predict robot movement
				if (robot.pos - pos):absoluteAngleDiff(dir) < 10 / 180 * math.pi then
					local rtargetDist = pos:distanceTo(robot.pos)
					if rtargetDist < targetDist then
						targetDist = rtargetDist
						target = robot
					end
				end
			end
			if target then -- if there is a pass reciever, just block it
				-- FIXME account for ball speed in dir calculation
				dir = Vector.fromAngle(target.dir)
				pos = target.pos
			end
		end
		isShot = true
	elseif not ballOwner or ballOwner.isFriendly then
		-- otherwise use center of directions to goal posts
		-- FIXME: check
		local left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos):normalize()
		local right = (World.Geometry.FriendlyGoalRight - World.Ball.pos):normalize()
		dir = left + right
	end

	return pos, dir, isShot
end


return Ball
