local Ball = {} 

local Constants = require "../base/constants"
local Cache = require "../base/cache"
local World = require "../base/world"
local Settings = require "settings"
local Field = require "util/field"
local geom = require "../base/geom"
local debug = require "../base/debug"
local ObserverRobot = require "observer/robot"
local vis = require "../base/vis"


---
-- @return robot, number - the first robot to reach the ball together with the time it will have in advance to the next opponent
function Ball.firstAtBall()
	local ball = World.Ball
	local minTime = math.huge
	local fastestRobot = nil
	for _, robot in ipairs(World.OpponentRobots) do
		local time = ObserverRobot.minTimeToBall(robot, World.Ball)
		if time < minTime then
			minTime = time
			fastestRobot = robot
		end
	end
	local opponentTime = minTime
	for _, robot in ipairs(World.FriendlyRobots) do
		local time = ObserverRobot.minTimeToBall(robot, World.Ball)
		if time < minTime then
			minTime = time
			fastestRobot = robot
		end
	end	
	return fastestRobot, opponentTime - minTime
end

function Ball.toBall(robot, ball)
	ball = ball or World.Ball
	
	local minTime = ObserverRobot.minTimeToBall(robot, ball)
	local minPos = Ball.ballAt(ball, minTime)
	local maxTime = ball.brakeTime > minTime and ball.brakeTime or minTime
	local maxPos = Ball.ballAt(ball, maxTime)
	local bsl = ball.speed:length()
	local midPos, midTime
	vis.addCircle("to ball", minPos, 0.03, vis.colors.green, true)
	vis.addCircle("to ball", maxPos, 0.03, vis.colors.red, true)
	repeat
		midPos = (minPos + maxPos)/2
		midTime = Ball.ballRollTime(bsl, midPos:distanceTo(ball.pos))
		local robotTime = ObserverRobot.timeToPos(robot, midPos)
		if robotTime < midTime then
			maxPos = midPos
		else
			minPos = midPos
		end
	until (maxPos - minPos):lengthSq() < 0.00001 -- 1 cm
	return midPos, midTime
end

--- Calculates the effective distance between ball and dribbler
-- find an ellipsis with the left and right dribbler edge points as focal points
-- dist is the length of the semi-minor axis
-- @param robot robot - the robot to calculate
-- @param ballPos vector - position of the ball
local function ellipticDistance(robot, ballPos)
	local dribblerPos = robot.pos + Vector.fromAngle(robot.dir):scaleLength(robot.shootRadius)
	local dribblerWidthHalf = Vector.fromAngle(robot.dir - math.pi/2):scaleLength(robot.dribblerWidth/2)
	local leftDribblerEdge = dribblerPos + dribblerWidthHalf
	local rightDribblerEdge = dribblerPos - dribblerWidthHalf
	return 0.5*math.sqrt((leftDribblerEdge:distanceTo(ballPos) + rightDribblerEdge:distanceTo(ballPos))^2 - robot.dribblerWidth*robot.dribblerWidth)
end

--- Returns the ball owner or nil if no one is nearer than Settings.ballOwnDistance(hysteresis)
-- @param robotlist robot[] - the robots which are qualified for being a ball owner (default: World.Robots)
-- @param lastBallOwner - the robot that was the ball owner before, used for hysteresis
-- @return ballOwner robot - the robot that can be seen as ball owner
local function ballOwner(robotlist, lastBallOwner)
	local ballInDangerRating = 0
	for _,r in pairs(World.Robots) do
		local dist = ellipticDistance(r, World.Ball.pos)
		if dist < 0.05 then
			ballInDangerRating = ballInDangerRating + 1
		elseif dist < 0.30 then
			ballInDangerRating = ballInDangerRating + (0.30 - dist)/0.25
		end
	end
	local ballOwnDistance = Settings.ballOwnDistance - math.max(ballInDangerRating, 2)*0.04
	robotlist = robotlist or World.Robots
	--search robot with min dist to ball
	local minDist = math.huge
	local ballOwner = nil
	for _,r in pairs(robotlist) do
		local dist = ellipticDistance(r, World.Ball.pos)
		if dist < minDist and dist <= ballOwnDistance then
			minDist = dist
			ballOwner = r
		end
	end

	-- calculate dist from lastBallOwner to ball
	local lastDist = math.huge
	if lastBallOwner then
		lastDist = ellipticDistance(lastBallOwner, World.Ball.pos)
	end

	-- set new lastBallOwner or nil, if no robot is near ball
	if minDist < (lastDist - Settings.ballOwnHysteresis) or not ballOwner then
		lastBallOwner = ballOwner
	end

	return lastBallOwner
end
--Ball.ballOwner = Cache.forFrame(Ball.ballOwner)


local lastBallOwnerFriendly
--- Wrapper function for ballOwner
-- @return ballOwner robot - a friendly robot, or nil
function Ball.friendlyBallOwner()
	lastBallOwnerFriendly = ballOwner(World.FriendlyRobots, lastBallOwnerFriendly)
	return lastBallOwnerFriendly
end

local lastBallOwnerOpponent
--- Wrapper function for ballOwner
-- @return ballOwner robot - an opponent robot, or nil
function Ball.opponentBallOwner()
	lastBallOwnerOpponent = ballOwner(World.OpponentRobots, lastBallOwnerOpponent)
	return lastBallOwnerOpponent
end



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

--- Calculates the position where the ball will be in a given time
-- ignores obstacles, also works for imaginary ball objects
-- @param ball object - the ball object which should be predicted
-- @param t number - the time after which the ball position is to be calculated
-- @return futureBallPos vector - the predicted ball position
function Ball.ballAt(ball, t)
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
		predicted.pos = Ball.ballAt(ball, ball.brakeTime)
		predicted.speed = Vector.create(0, 0)
		predicted.brakeTime = 0
	else
		predicted.pos = Ball.ballAt(ball, t)
		predicted.speed = ball.speed + ball.deceleration * t
		predicted.brakeTime = ball.brakeTime - t
	end
	predicted.deceleration = ball.deceleration
	
	-- limit ball position to field, keeps reachBallPos from timing out
	-- makes even much more sense, as the ball can only be catched inside the field
	predicted.pos = Field.limitToField(predicted.pos, World.Geometry.BoundaryWidth)
	
	return predicted
end


local lastBallSpeedLength = -1
local lastShootTime = 0
local cacheTime = 0
local cachedShootRobot = nil
local shootCooldown = 0.1 --ball can be shot at least 0.1s after the last shot
local speedDiff = 0.1 --ball has to be 0.1m/s faster than the robot
local accelerationPerFrame = 5 --ball has to accelerate at least x m/s^2 to count as shot

function Ball.isShot()
	-- caching
	if World.Time == cacheTime then
		return cachedShootRobot
	end

	if not World.Ball:isPositionValid() then
		return
	end

	local ballSpeedLength = World.Ball.speed:length()

	-- if the ball was not shot in the last tenth second
	local condCooldown = (World.Time > lastShootTime + shootCooldown)
	-- if the ball accelerates
	local condAccelerates = (ballSpeedLength > lastBallSpeedLength + accelerationPerFrame * World.TimeDiff)
	-- if the ball is fast
	local condFast = (ballSpeedLength > Settings.fastBall)	
	-- if one robot had the ball the last 0.1 seconds (equal to cooldown time)
	local condHadBall = false
	-- if this robot looks about in the same direction as the ball rolls
	local condDirection = false
	-- if the ball is distinctly faster than this robot
	local condFasterThanRobot = false

	local robot = nil
	if condCooldown and condAccelerates and condFast then
		local ObserverRobot = require "observer/robot"
		for _,r in pairs(World.Robots) do
			if ObserverRobot.hadBall(r, shootCooldown) then
				condHadBall = true
				local anglediff = math.abs(geom.getAngleDiff(r.dir, World.Ball.speed:angle()))
				condDirection = (anglediff < Settings.tiltShotAngle)
				condFasterThanRobot = (ballSpeedLength > speedDiff + r.speed:length())
				debug.set("robot speed", r.speed:length())
				if condDirection and condFasterThanRobot then
					robot = r
					break
				end
			end
		end
	end

	-- update cache
	cacheTime = World.Time
	cachedShootRobot = robot

	-- lastShootTime is used for the cooldown
	if robot then
		lastShootTime = World.Time
	end
	lastBallSpeedLength = ballSpeedLength

	if Settings.DEBUG then
		debug.pushtop("Ball.isShot")
		debug.set("cooldown", condCooldown)
		debug.set("accelerates", condAccelerates)
		debug.set("fast", condFast)
		debug.set("hadBall", condHadBall)
		debug.set("direction", condDirection)
		debug.set("fasterThanRobot", condFasterThanRobot)
		debug.pop()
	end

	return robot
end

return Ball
