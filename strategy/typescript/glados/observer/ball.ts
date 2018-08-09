local Ball = {}

local Cache = require "../base/cache"
local debug = require "../base/debug"
local geom = require "../base/geom"
local plot = require "../base/plot"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Physics = require "observer/physics"
local ObserverRobot = require "observer/robot"


//- Returns the first robot that can reach the ball, along with the estimated time
// @param robotlist Robot[] - all robots that should be considered (e.g. World.FriendlyRobots)
// @return Robot - the fastest robot
// @return number - the estimated time (the robot will look towards its opponent goal)
function Ball.firstRobotAtBall(robotlist)
	local minTime = math.huge
	local minRobot = nil
	for _,r in ipairs(robotlist) do
		local time =  ObserverRobot.minTimeToBall(r)
		if time < minTime then
			minTime = time
			minRobot = r
		end
	end
	return minRobot, minTime
end
Ball.firstRobotAtBall = Cache.forFrame(Ball.firstRobotAtBall)

function Ball.opponentBallDribbler()
	local MAX_SPEED_DIFF = 1.5
	local MAX_DISTANCE = 0.5
	local MAX_ANGLE_TO_BALL_POS = 60 / 180 * math.pi
	local MAX_ANGLE_TO_BALL_SPEED = 10 / 180 * math.pi
	local slowBall = Ball.isSlowBall()
	local bestRobot = nil
	local bestDist = math.huge
	for _, robot in ipairs(World.OpponentRobots) do
		local distance = robot.pos:distanceTo(World.Ball.pos)
		local direction = Vector.fromAngle(robot.dir)
		if robot.speed:distanceTo(World.Ball.speed) < MAX_SPEED_DIFF
				and (slowBall or robot.speed:angleDiff(World.Ball.speed) < MAX_ANGLE_TO_BALL_SPEED)
				and distance < MAX_DISTANCE and distance < bestDist
				and World.Ball.posZ < 0.1
				and direction:absoluteAngleDiff(World.Ball.pos - robot.pos) < MAX_ANGLE_TO_BALL_POS then
			bestRobot = robot
			bestDist = distance
		end
	end
	return bestRobot
end
Ball.opponentBallDribbler = Cache.forFrame(Ball.opponentBallDribbler)

//- Returns wether or not the ball is heading for a goal
// WARNING: this function has no hysteresis and must be used with care
// @param ball - a ball like structure
// @param ownGoal - wether to use the friendly goal or the opponent goal
// @return bool - wether or not the ball is heading for the goal
function Ball.ballHeadingForGoal(ball, ownGoal)
	local friendlyFactor = ownGoal and 1  or -1
	local goalCenter = ownGoal and World.Geometry.FriendlyGoal or World.Geometry.OpponentGoal
	local _, lambda = geom.intersectLineLine(goalCenter, Vector(1, 0), ball.pos, ball.speed)
	return lambda and math.abs(lambda) < World.Geometry.GoalWidth / 2 + 0.2 and World.Ball.speed.y * friendlyFactor < 0
end



//- Calculates the effective distance between ball and dribbler
// find an ellipsis with the left and right dribbler edge points as focal points
// dist is the length of the semi-minor axis
// @param robot robot - the robot to calculate
// @param ballPos vector - position of the ball
local function ellipticDistance(robot, ballPos)
	local dribblerPos = robot.pos + Vector.fromAngle(robot.dir):scaleLength(robot.shootRadius)
	local dribblerWidthHalf = Vector.fromAngle(robot.dir - math.pi/2):scaleLength(robot.dribblerWidth/2)
	local leftDribblerEdge = dribblerPos + dribblerWidthHalf
	local rightDribblerEdge = dribblerPos - dribblerWidthHalf
	return 0.5*math.sqrt((leftDribblerEdge:distanceTo(ballPos) + rightDribblerEdge:distanceTo(ballPos))^2 - robot.dribblerWidth*robot.dribblerWidth)
end

//- Returns the ball owner or nil if no one is nearer than Settings.ballOwnDistance(hysteresis)
// @param robotlist robot[] - the robots which are qualified for being a ball owner (default: World.Robots)
// @param lastBallOwner - the robot that was the ball owner before, used for hysteresis
// @return ballOwner robot - the robot that can be seen as ball owner, or nil, if no robot is near the ball
local BALL_OWN_HYSTERESIS = 0.03
local ballOwnerEllipticCache = {}
local ballOwnerCheckCache // function is defined belwo
local function getBallOwner(robotlist, lastBallOwner)
	if not ballOwnerEllipticCache["ballInDangerRating"] then
		local ballInDangerRating = 0
		for _, r in ipairs(World.Robots) do
			local dist
			// pre filter robots
			// dist = max(ballInDangerMaxDist, ballOwnDistance) + 2 * robot.radius
			// = 0.3 + 0.18 = 0.5
			if r.pos:distanceToSq(World.Ball.pos) > 0.5 * 0.5 then
				dist = 0.5
			else
				dist = ellipticDistance(r, World.Ball.pos)
			end
			ballOwnerEllipticCache[r] = dist
			if dist < 0.05 then
				ballInDangerRating = ballInDangerRating + 1
			elseif dist < 0.30 then
				// distance must correlate to pre filter distance
				ballInDangerRating = ballInDangerRating + (0.30 - dist)*4
			end
		end
		ballOwnerEllipticCache["ballInDangerRating"] = ballInDangerRating
	end
	local ballInDangerRating = ballOwnerEllipticCache["ballInDangerRating"]
	// distance must correlate to pre filter distance
	local ballOwnDistance = 0.2 - math.min(ballInDangerRating, 2)*0.04

	// search robot with min dist to ball
	local minDist = math.huge
	local ballOwner = nil
	for _, r in ipairs(robotlist) do
		local dist = ballOwnerEllipticCache[r]
		if dist and dist < minDist and dist <= ballOwnDistance then
			minDist = dist
			ballOwner = r
		end
	end

	// calculate dist from lastBallOwner to ball
	local lastDist = math.huge
	if lastBallOwner then
		lastDist = ballOwnerEllipticCache[lastBallOwner] or lastDist
	end

	// set new lastBallOwner or nil, if no robot is near ball
	if (minDist + BALL_OWN_HYSTERESIS) < lastDist
			or (not ballOwner and lastDist >= ballOwnDistance + BALL_OWN_HYSTERESIS) then
		lastBallOwner = ballOwner
	end

	return lastBallOwner
end


local lastBallOwnerFriendly
local friendlyBallOwnerTime = 0
function Ball.friendlyBallOwner()
	return lastBallOwnerFriendly
end

function Ball.friendlyBallOwnerTime()
	return friendlyBallOwnerTime
end

local function updateFriendlyBallOwner()
	ballOwnerCheckCache()
	lastBallOwnerFriendly = getBallOwner(World.FriendlyRobots, lastBallOwnerFriendly)
	if lastBallOwnerFriendly then
		friendlyBallOwnerTime = World.Time
	end
	debug.pushtop()
	debug.set("last friendly ball owner", lastBallOwnerFriendly)
	debug.pop()
end

local lastBallOwnerOpponent
local opponentBallOwnerTime = 0
function Ball.opponentBallOwner()
	return lastBallOwnerOpponent
end

local function updateOpponentBallOwner()
	ballOwnerCheckCache()
	lastBallOwnerOpponent = getBallOwner(World.OpponentRobots, lastBallOwnerOpponent)
	if lastBallOwnerOpponent then
		opponentBallOwnerTime = World.Time
	end
	debug.pushtop()
	debug.set("last opponent ball owner", lastBallOwnerOpponent)
	debug.pop()
end

function Ball.opponentBallOwnerTime()
	return opponentBallOwnerTime
end

local friendlyBallOwnershipTime = 0
local friendlyBallOwnershipDuration = 0
local function updateFriendlyBallOwnershipTime()
	local lastStateChangeTime = Referee.lastStateChangeTime()
	if opponentBallOwnerTime > friendlyBallOwnerTime or Referee.isStopState() then
		friendlyBallOwnershipTime = 0
		friendlyBallOwnershipDuration = 0
	elseif friendlyBallOwnershipTime == 0 and friendlyBallOwnerTime > opponentBallOwnerTime
			and lastStateChangeTime and lastStateChangeTime < friendlyBallOwnerTime then
		friendlyBallOwnershipTime = friendlyBallOwnerTime
	elseif friendlyBallOwnershipTime ~= 0 then
		friendlyBallOwnershipDuration = World.Time - friendlyBallOwnershipTime
	end
end

function Ball.friendlyBallOwnershipDuration()
	return friendlyBallOwnershipDuration
end

ballOwnerCheckCache = function()
	if lastBallOwnerFriendly ~= World.Time and lastBallOwnerOpponent ~= World.Time then
		ballOwnerEllipticCache = {}
	end
end

local ballRecipients = {}
local function updateReceivesPass()
	local ballSpeed = World.Ball.speed:length()
	if ballSpeed < 0.5 then
		ballRecipients = {}
		return
	end

	local ballDir = World.Ball.speed:angle()
	local coneWidthSmall = 50 * math.pi / 180
	local coneWidthLarge = 65 * math.pi / 180
	local coneAngleMinSmall = ballDir - coneWidthSmall / 2
	local coneAngleMinLarge = ballDir - coneWidthLarge / 2

	local newBallRecipients = {}
	for _,robot in ipairs(World.Robots) do

		// check if the robot is inside the cone (hysteresis)
		local coneWidth = ballRecipients[robot] and coneWidthLarge or coneWidthSmall
		local coneAngleMin = ballRecipients[robot] and coneAngleMinLarge or coneAngleMinSmall

		local maxRobotTime = 0.4
		local robotBallDistance = World.Ball.pos:distanceTo(robot.pos)
		local maxMoveDistance = (ballSpeed + robot.maxSpeed) * maxRobotTime
		local robotTime
		if maxMoveDistance < robotBallDistance then
			robotTime = maxRobotTime
		else
			robotTime = math.bound(0, ObserverRobot.minTimeToBall(robot), maxRobotTime)
		end
		local extrapolatedRobotPos = robot.pos + robot.speed * robotTime
		local toRobotAngle = (extrapolatedRobotPos - World.Ball.pos):angle()
		if robotBallDistance > World.Ball.radius + robot.shootRadius
				and geom.normalizeAnglePositive(toRobotAngle - coneAngleMin) > coneWidth then
			goto continue
		end

		// check if the arriving ball is fast enough (hysteresis)
		local minBallSpeed = ballRecipients[robot] and 0.5 or 1.0
		local dribblerPos = extrapolatedRobotPos + Vector.fromAngle(robot.dir) * robot.shootRadius
		local distanceToRobot = World.Ball.pos:distanceTo(dribblerPos)
		if Physics.ballAtTime(World.Ball, Physics.ballRollTime(
				World.Ball, distanceToRobot)).speed:length() < minBallSpeed then
			goto continue
		end

		newBallRecipients[robot] = true


		vis.addCircle("o/ball: receivesPass", robot.pos, 0.15,
			vis.fromRGBA(127, 191, 255, 63), true, true)
::continue::
	end

	ballRecipients = newBallRecipients
end

function Ball.receivesPass(robot)
	return ballRecipients[robot]
end

local lastBallSpeedLength = 0 // used for both isAccelerating() and isShot()
local ballIsAccelerating = false
function Ball.isAccelerating()
	return ballIsAccelerating
end

local function updateIsAccelerating()
	local currentBallSpeedLength = World.Ball.speed:length()
	ballIsAccelerating = currentBallSpeedLength > lastBallSpeedLength + 0.2
	lastBallSpeedLength = currentBallSpeedLength
end


local lastShootTime = 0
local lastShootRobot = nil
function Ball.isShot()
	if lastShootTime == World.Time then
		return lastShootRobot
	end
	return nil
end

function Ball.wasShot(time)
	if lastShootTime + time >= World.Time then
		return lastShootRobot
	end
	return nil
end

local function updateIsShot()
	if not World.Ball:isPositionValid() then
		return
	end

	local ballSpeedLength = World.Ball.speed:length()

	// if the ball was not shot in the last tenth second
	local condCooldown = (World.Time > lastShootTime + 0.3)
	// if the ball accelerates
	local condAccelerates = Ball.isAccelerating()
	// if the ball is fast
	local condFast = (ballSpeedLength > 0.5)
	// if one robot had the ball the last 0.1 seconds (equal to cooldown time)
	local condHadBall = false
	// if this robot looks about in the same direction as the ball rolls
	local condDirection = false
	// if the ball is distinctly faster than this robot
	local condFasterThanRobot = false

	debug.pushtop("Ball.isShot")
	local robot = nil
	if condCooldown and condAccelerates and condFast then
		for _,r in ipairs(World.Robots) do
			if ObserverRobot.hadBall(r, 0.3) then
				condHadBall = true
				local anglediff = math.abs(geom.getAngleDiff(r.dir, World.Ball.speed:angle()))
				// the ball has to be shot in the approximate direction the robot is facing
				condDirection = (anglediff < 45 / 180 * math.pi)
				// the ball has to be 0.1m/s faster than the robot
				condFasterThanRobot = (ballSpeedLength > 0.1 + r.speed:length())
				debug.set("robot speed", r.speed:length())
				if condDirection and condFasterThanRobot then
					robot = r
					break
				end
			end
		end
	end

	// lastShootTime is used for the cooldown
	if robot then
		lastShootTime = World.Time
		lastShootRobot = robot
	end

	debug.set("cooldown", condCooldown)
	debug.set("accelerates", condAccelerates)
	debug.set("fast", condFast)
	debug.set("hadBall", condHadBall)
	debug.set("direction", condDirection)
	debug.set("fasterThanRobot", condFasterThanRobot)
	debug.pop()

	plot.addPlot("isShot", robot and (robot.id + (robot.isFriendly and 0 or 0.5)) or -1)
end

local ballPosBuffer = {}
local ballPosBufferTimeFrame = 1
local ballPosBufferMaxBallSpeed = 1
local function updateIsDangerousDuelSituation()
	if not Referee.isGameState() or World.Ball.speed:length() > ballPosBufferMaxBallSpeed then
		ballPosBuffer = {}
		return false
	end

	for time in pairs(ballPosBuffer) do
		if World.Time - time > ballPosBufferTimeFrame then
			ballPosBuffer[time] = nil
		end
	end

	// if World.Ball.speed:length() < ballPosBufferMaxBallSpeed then
		ballPosBuffer[World.Time] = World.Ball.pos
	// end
end

local ballPosHysteresis = 0.5 // to each side
local function isDangerousDuelSituation(lastDecision)
	local max_y = -math.huge
	local min_time = math.huge
	local max_time = 0
	for time, ballPos in pairs(ballPosBuffer) do
		if ballPos.y > max_y then
			max_y = ballPos.y
		end
		if time < min_time then
			min_time = time
		end
		if time > max_time then
			max_time = time
		end
	end

	local time_interval = max_time - min_time
	if time_interval == math.huge or time_interval <= 0.5 then
		return false
	end

	local hysteresis = lastDecision and -ballPosHysteresis or ballPosHysteresis
	local danger = max_y + hysteresis < -0.2 * World.Geometry.FieldHeightHalf

	if danger then
		vis.addCircle("o/ball: dangerous duel situation", World.Ball.pos, 0.07, vis.colors.redHalf, true)
	end
end
Ball.isDangerousDuelSituation = Cache.forFrame(isDangerousDuelSituation)

local flyingOrBouncingTimestamp = 0
local function updateIsFlyingOrBouncing()
	if World.Ball.posZ ~= 0 then
		flyingOrBouncingTimestamp = World.Time
	end
end

function Ball.isFlyingOrBouncing()
	return World.Time - flyingOrBouncingTimestamp < 0.1
end

// TODO: might be better to implement a more refined version in the tracking
local MAX_FRAME_DISTANCE = 1.5
local MAX_INVISIBLE_TIME = 1.5
local lastRealisticBallPos
local lastRealisticBallTime = 0
function Ball.getRealisticBallPos()
	return lastRealisticBallPos
end

local function updateLastRealisticBall()
	if not lastRealisticBallPos or lastRealisticBallPos:distanceTo(World.Ball.pos) < MAX_FRAME_DISTANCE
		or World.Time - lastRealisticBallTime > MAX_INVISIBLE_TIME then
		lastRealisticBallPos = World.Ball.pos:copy()
		lastRealisticBallTime = World.Time
	end
end

local SLOW_BALL_SPEED = 0.5
local SLOW_BALL_HYSTERESIS = 0.1
local slowBall = false
function Ball.isSlowBall()
	return slowBall
end

local function updateIsSlowBall()
	local hysteresisSpeed = SLOW_BALL_SPEED + (slowBall and SLOW_BALL_HYSTERESIS or 0)
	slowBall = World.Ball.speed:lengthSq() < hysteresisSpeed * hysteresisSpeed
end

function Ball._update()
	updateReceivesPass()
	updateIsAccelerating()
	updateIsShot()
	updateIsDangerousDuelSituation()
	updateIsFlyingOrBouncing()
	updateLastRealisticBall()
	updateIsSlowBall()
	updateOpponentBallOwner()
	updateFriendlyBallOwner()
	updateFriendlyBallOwnershipTime()
end

return Ball
