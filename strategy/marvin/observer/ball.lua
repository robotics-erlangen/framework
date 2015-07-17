local Ball = {}

local Constants = require "../base/constants"
local Cache = require "../base/cache"
local World = require "../base/world"
local Field = require "../base/field"
local geom = require "../base/geom"
local debug = require "../base/debug"
local vis = require "../base/vis"
local math = require "../base/math"
local plot = require "../base/plot"

local ObserverRobot = require "observer/robot"
local Physics = require "observer/physics"


--- Gives the robot that can reach the ball first
-- @return Robot - the fastest robot
-- @return number - the time difference between the fastest opponent and the fastest friendly robot
function Ball.firstAtBall()
	local ball = World.Ball
	local minOpponentTime = math.huge
	local fastestRobot = nil
	for _, robot in ipairs(World.OpponentRobots) do
		local time = ObserverRobot.minTimeToBall(robot)
		if time < minOpponentTime then
			minOpponentTime = time
			fastestRobot = robot
		end
	end
	local minFriendLyTime = math.huge
	for _, robot in ipairs(World.FriendlyRobots) do
		local time = ObserverRobot.minTimeToBall(robot)
		if time < minFriendLyTime then
			minFriendLyTime = time
			if minFriendLyTime < minOpponentTime then
				fastestRobot = robot
			end
		end
	end
	return fastestRobot, minOpponentTime - minFriendLyTime
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
-- @return ballOwner robot - the robot that can be seen as ball owner, or nil, if no robot is near the ball
local BALL_OWN_HYSTERESIS = 0.03
local function ballOwner(robotlist, lastBallOwner)
	local ballInDangerRating = 0
	for _, r in ipairs(World.Robots) do
		local dist = ellipticDistance(r, World.Ball.pos)
		if dist < 0.05 then
			ballInDangerRating = ballInDangerRating + 1
		elseif dist < 0.30 then
			ballInDangerRating = ballInDangerRating + (0.30 - dist)/0.25
		end
	end
	local ballOwnDistance = 0.15 - math.min(ballInDangerRating, 2)*0.04

	-- search robot with min dist to ball
	local minDist = math.huge
	local ballOwner = nil
	for _, r in ipairs(robotlist) do
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
	if (minDist + BALL_OWN_HYSTERESIS) < lastDist
			or (not ballOwner and lastDist >= ballOwnDistance + BALL_OWN_HYSTERESIS) then
		lastBallOwner = ballOwner
	end

	return lastBallOwner
end


local lastBallOwnerFriendly
local friendlyBallOwnerLastRun = 0
--- Wrapper function for ballOwner
-- @return ballOwner robot - a friendly robot, or nil
function Ball.friendlyBallOwner()
	if World.Time == friendlyBallOwnerLastRun then
		return lastBallOwnerFriendly
	end
	friendlyBallOwnerLastRun = World.Time
	lastBallOwnerFriendly = ballOwner(World.FriendlyRobots, lastBallOwnerFriendly)
	debug.pushtop()
	debug.set("last friendly ball owner", lastBallOwnerFriendly)
	debug.pop()
	return lastBallOwnerFriendly
end

local lastBallOwnerOpponent
local opponentBallOwnerLastRun = 0
--- Wrapper function for ballOwner
-- @return ballOwner robot - an opponent robot, or nil
function Ball.opponentBallOwner()
	if World.Time == opponentBallOwnerLastRun then -- already calculated in this frame
		return lastBallOwnerOpponent
	end
	opponentBallOwnerLastRun = World.Time
	lastBallOwnerOpponent = ballOwner(World.OpponentRobots, lastBallOwnerOpponent)
	debug.pushtop()
	debug.set("last opponent ball owner", lastBallOwnerOpponent)
	debug.pop()
	return lastBallOwnerOpponent
end


local SLOW_BALL = 0.5
local MIN_TIME_ADVANCE = 0
--- checks if the robot can get the currently moving ball as a pass
-- always assumes that the robot moves to nearest point on the line defined by the ball sped
-- @param robot Robot
-- @return bool
function Ball.receivesPass(robot, allowSlowEndSpeed)
	-- if the initial ball speed is too low
	if World.Ball.speed:length() < SLOW_BALL then
		debug.set("receivesPass", "slow ball")
		return false
	end

	local balldir = World.Ball.speed:copy():normalize()
	local dribblerOffset = Vector.fromAngle(robot.dir) * (robot.shootRadius + World.Ball.radius)
	local dribblerPos, lambda = geom.intersectLineLine(World.Ball.pos, balldir, robot.pos + dribblerOffset, balldir:perpendicular())

	-- if the ball is behind or inside the robot
	if lambda < robot.shootRadius then
		debug.set("receivesPass", "ball behind robot")
		return false
	end

	local robotMid = dribblerPos - dribblerOffset
	-- anywhere on the dribbler is okay, not only the center
	local dribblerHalf = balldir:perpendicular() * (robot.dribblerWidth / 2)
	robotMid = robot.pos:nearestPosOnLine(robotMid + dribblerHalf, robotMid - dribblerHalf)

	local robotTime = Physics.robotTimeToPos(robot, robotMid, Vector(0, 0))
	local ballTime = Physics.ballRollTime(World.Ball, math.max(0, lambda - robot.shootRadius - World.Ball.radius))

	-- if the robot takes longer than the ball
	if ballTime - robotTime < MIN_TIME_ADVANCE then
		debug.set("receivesPass", "ball before robot")
		return false
	end

	local futureBall = Physics.ballAtTime(World.Ball, ballTime)

	-- if the ball will be too slow
	if futureBall.speed:length() < SLOW_BALL and not allowSlowEndSpeed then
		debug.set("receivesPass", "slow future ball")
		return false
	end

	debug.set("receivesPass", "yes")
	return true
end
Ball.receivesPass = Cache.forFrame(Ball.receivesPass)


--- Calculates the probability that the given opponent robot catches the ball
-- @param robot Robot - opponent robot
-- @param shootTime number - how long to wait before shoot
-- @param rollTime number - how long it takes the ball to travel to the catchPos
-- @param catchPos Vector - where the robot might catch the ball
-- @param corridorHalf Vector - the ball can only be catched in [catchPos-corridorHalf, catchPos+corridorHalf]
-- @return catchProbability number - the chance that the given opponent robot catches the ball
function Ball.ballCatchProbability(robot, shootTime, rollTime, catchPos, corridorHalf)
	local latency = 0.1 -- MAGIC CONSTANT -- time the robot needs to react
	local damping = 0.5 -- MYSTERIOUS MAGIC CONSTANT - this factor describes how much of their maximum acceleration the robots use before they can react
	local corridorWidthHalf = corridorHalf:length()
	local toCorridor = catchPos - robot.pos
	local distToCorridor = toCorridor:length()
	local v_toSector = robot.speed:dot(corridorHalf)*math.sign(toCorridor:dot(corridorHalf)) / corridorWidthHalf -- part of robot.speed perpendicular to shoot corridor
	debug.set("v to sector", v_toSector)
	local time = shootTime + rollTime	-- the time from now to the moment to catch the ball
	local expectedPos = v_toSector*time	-- position, which the robot reaches without changing speed
	local expPos = robot.pos + toCorridor:setLength(expectedPos)
	local d0, flagAcc
	if expectedPos < distToCorridor - corridorWidthHalf - robot.radius then	-- if robot must accelerate to reach corridor in time
		flagAcc = true
		d0 = distToCorridor - robot.radius - corridorWidthHalf
	elseif expectedPos > distToCorridor + corridorWidthHalf + robot.radius then	-- if robot must decelerate to stay in sector
		flagAcc = false
		d0 = distToCorridor + robot.radius + corridorWidthHalf
	else								-- if robot reaches the corridor in time with its current speed
		return 1
	end
	local maxAcceleration = robot.acceleration.aSpeedupFMax
	local maxDeceleration = robot.acceleration.aBrakeFMax
	local neededAcc
	if rollTime < latency then
		neededAcc = 2*(d0 - expectedPos)/(damping*time*time)
	else
		local t1 = shootTime + latency	-- the time span while the robots can not react
		local t2 = rollTime - latency	-- the time span while the robots can react
		neededAcc = (d0 - expectedPos)/(0.5*damping*t1*t1 + damping*t1*t2 + 0.5*t2*t2)
	end
	if flagAcc then
		return (neededAcc >= maxAcceleration) and 0 or math.sqrt((maxAcceleration - neededAcc)/maxAcceleration)
	else
		return (neededAcc <= maxDeceleration) and 0 or math.sqrt((maxDeceleration - neededAcc)/maxDeceleration)
	end
end

local lastBallSpeedLength = -1
local lastShootTime = 0
local cacheTime = 0
local cachedShootRobot = nil
local shootCooldown = 0.1 --ball can be shot at least 0.1s after the last shot
local speedDiff = 0.1 --ball has to be 0.1m/s faster than the robot
local accelerationPerFrame = 5 --ball has to accelerate at least x m/s^2 to count as shot
local TILT_SHOT_ANGLE = 45/180*math.pi -- the max offset angle for tilted and volley shots
local FAST_BALL = 1.0
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
	local condFast = (ballSpeedLength > FAST_BALL)
	-- if one robot had the ball the last 0.1 seconds (equal to cooldown time)
	local condHadBall = false
	-- if this robot looks about in the same direction as the ball rolls
	local condDirection = false
	-- if the ball is distinctly faster than this robot
	local condFasterThanRobot = false

	local robot = nil
	if condCooldown and condAccelerates and condFast then
		for _,r in pairs(World.Robots) do
			if ObserverRobot.hadBall(r, shootCooldown) then
				condHadBall = true
				local anglediff = math.abs(geom.getAngleDiff(r.dir, World.Ball.speed:angle()))
				condDirection = (anglediff < TILT_SHOT_ANGLE)
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

	debug.pushtop("Ball.isShot")
	debug.set("cooldown", condCooldown)
	debug.set("accelerates", condAccelerates)
	debug.set("fast", condFast)
	debug.set("hadBall", condHadBall)
	debug.set("direction", condDirection)
	debug.set("fasterThanRobot", condFasterThanRobot)
	debug.pop()

	plot.addPlot("isShot", robot and (robot.id + (robot.isFriendly and 0 or 0.5)) or -1)

	return robot
end

return Ball
