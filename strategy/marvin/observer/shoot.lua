local Shoot = {}

local Constants = require "../base/constants"
local World = require "../base/world"
local Settings = require "settings"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Geom = require "../base/geom"
local Field = require "util/field"
local Messaging = require "control/messaging"
local debug = require "../base/debug"
local vis = require "../base/vis"


--- Calculates the chance that a pass to the targetRobot will succeed
-- in terms of opponent robots catching the ball
-- @param targetRobot Robot - the robot that should receive the pass
-- @param shootTime number - the time when the ballie shoots
-- [@param targetPos Vector - the position where the pass should be received]
-- @return passChance number - the calculated chance that the ball reaches the target position
function Shoot.evaluatePassCorridor(targetRobot, shootTime, targetPos)
	-- TODO: test
	local corridorWidthHalf = World.Ball.radius + Constants.positionError	

	local targetPos = targetPos or (targetRobot.pos + targetRobot.speed*shootTime) -- or targetRobot.trajectory:predictPos(shootTime)
	local predictedBallState = Ball.atTime(shootTime)

	local corridorHalf = (targetPos - predictedBallState.pos):perpendicular():setLength(corridorWidthHalf)
	
	local passChance = 1
	for _, robot in pairs(World.OpponentRobots) do
		local pointOnLine = robot.pos:nearestPosOnLine(predictedBallState.pos, targetPos)
		local ballRollTime = Shoot.ballPassTime(predictedBallState.pos, targetRobot, targetPos, (predictedBallState.pos - pointOnLine):length())
		local ballCatchProbability = Ball.ballCatchProbability(robot, shootTime, ballRollTime, pointOnLine, corridorHalf)
		passChance = passChance * (1 - ballCatchProbability)
	end
	return passChance
end

--- Calculates the chance that a shot (e.g. on the goal) is successful
-- @param endPos Vector - the position that is aimed
-- @param speed number - speed of the ball immediately after the shot
-- [@param startPos Vector - the position from where the ball is shot; default = current ball position]
-- [@param shootTime number - the time from now to the moment when the ball is shot; default = now]
-- [@param robots object list - all robots that should be regarded; default = all robots]
-- @return shootChance number - chance that the ball reaches the aimed end position
function Shoot.evaluateShootCorridor(endPos, speed, startPos, shootTime, robots)
	startPos = startPos or World.Ball.pos
	shootTime = shootTime or 0
	robots = robots or World.Robots
	local predictedBallPos
	if shootTime == 0 then
		predictedBallPos = startPos
	else
		predictedBallPos = Ball.atTime(shootTime).pos
	end
	local corridorWidthHalf = World.Ball.radius + Constants.positionError
	local corridorHalf = (endPos - predictedBallPos):perpendicular():setLength(corridorWidthHalf)
	local shootChance = 1
	for _, r in ipairs(robots) do
		local pointOnLine = r.pos:nearestPosOnLine(predictedBallPos, endPos)
		local ballRollTime = Ball.ballRollTime(speed, (pointOnLine - startPos):length())
		local ballCatchProbability = Ball.ballCatchProbability(r, shootTime, ballRollTime, pointOnLine, corridorHalf)
		--log("Robot "..tostring(r.id)..": Time to reach ShootCorridor "..tostring(ballRollTime))
		--log("Robot "..tostring(r.id)..": Chance "..tostring(ballCatchProbability))
		shootChance = shootChance*(1 - ballCatchProbability)
	end
	return shootChance
end

--- Calculates the chance that a chipped pass to the targetRobot will succeed in terms of opponent robots catching the ball
-- @param targetRobot Robot - the robot that should receive the pass
-- @param shootTime number - the time when the ballie shoots
-- [@param targetPos Vector - the position where the pass should be received]
-- @return passChance number - the chance that the ball reaches the target position
function Shoot.evaluateChipCorridor(targetRobot, shootTime, targetPos)
	--TODO: test
	local passChance = 1
	-- assuming the chip is shot in 45 degree angle, FIXME get angle from robot
	local liftDistance = 2 * math.sqrt(targetRobot.height)
	if (targetPos - World.Ball.pos):length() > 2 * liftDistance + targetRobot.radius then
		local corridorWidthHalf = World.Ball.radius + Constants.positionError	

		targetPos = targetPos or targetRobot.trajectory:predictPos(shootTime)		--FIXME add time needed to reach target
		local ballPos = Ball.atTime(shootTime)

		local corridorHalf = (targetPos - ballPos):perpendicular():setLength(corridorWidthHalf)

		for _, robot in pairs(World.OpponentRobots) do
			local x = (targetPos - ballPos):setLength(liftDistance)			--liftDistance ist the distance, the ball needs to be able to fly over robots 														TODO test liftDistance
			local pointOnLine = Geom.nearestPosOnLine(robot.pos, ballPos, ballPos + x)
			local ballRollTime = Shoot.ballPassTime(ballPos, targetRobot, targetPos, (ballPos - pointOnLine):length())
			local ballCatchProbability = Ball.ballCatchProbability(robot, shootTime, ballRollTime, pointOnLine, corridorHalf)
			passChance = passChance * (1 - ballCatchProbability)
	
			local pointOnLine = Geom.nearestPosOnLine(robot.pos, targetPos - x, targetPos)
			local ballRollTime = Shoot.ballPassTime(ballPos, targetRobot, targetPos, (ballPos - pointOnLine):length())
			local ballCatchProbability = Ball.ballCatchProbability(robot, shootTime, ballRollTime, pointOnLine, corridorHalf)
			passChance = passChance * (1 - ballCatchProbability)
		end
	else 
		Shoot.evaluatePassCorridor(targetRobot, targetPos, shootTime)
	end
	return passChance
end

--- Calculates how long the ball will take when passed to travel the given distance
-- @param futureBallPos Vector - where the ball will be when we shoot
-- @param targetRobot Robot - the pass receiver
-- @param targetPos Vector - where the targetRobot will be
-- @param distance number - the distance
-- @return ballRollTime number - the time after which the ball has travelled the given distance
function Shoot.ballPassTime(futureBallPos, targetRobot, targetPos, distance) 
	local passDistance = (targetPos - futureBallPos):length()
	local v = targetRobot:calculateShootSpeed(targetRobot.constants.passSpeed, passDistance)
	return Ball.ballRollTime(v, distance)
end
 

local function assistantOrder(r1, r2)
	return Shoot.rateAssistant(r1) > Shoot.rateAssistant(r2)
end

--- returns nil or a robot which can be passed to and, if there a more of them, the one who is closest to the opponent goal in combination with the biggest free goal sectors
-- @param activeRobot - the robot who is searching for a pass receiver
-- @return robot or nil - the most suitable robot, if any 
function Shoot.bestFreeAssistant(activeRobot)
	-- !!! ATTENTION !!! Assumes we are already at the ball
	local freeAssistants = {}
	for _, r in ipairs(World.FriendlyRobots) do
		if r ~= activeRobot and Messaging.get("attackerFlag")[r]
			and Field.isInField(r.pos) and Robot.wayToRobotFree(r, activeRobot)
		then
			table.insert(freeAssistants, r)
		end
	end
	table.sort(freeAssistants, assistantOrder)
	return freeAssistants[1]
end

function Shoot.rateAssistant(robot)
	local biggestInterval = Goal.largestFreeSector(robot.pos, World.OpponentRobots, true)
	local biggestSector = biggestInterval and (biggestInterval[2] - biggestInterval[1]) or 0
	local goalDist = robot.pos:distanceTo(World.Geometry.OpponentGoal)
	local rating = World.Geometry.FieldHeight - goalDist
	local ballDist = robot.pos:distanceTo(World.Ball.pos)
	local distRateFactor
	if ballDist < 0.5 then
		distRateFactor = 0
	elseif ballDist < 1 then
		distRateFactor = 2*ballDist - 1
	else
		distRateFactor = 1
	end
	local backPassDist = robot.pos:distanceTo(World.Geometry.OpponentGoal) - World.Ball.pos:distanceTo(World.Geometry.OpponentGoal)
	local backRateFactor
	if backPassDist > 1 then
		backRateFactor = 0
	elseif backPassDist > 0.5 then
		backRateFactor = 2 - 2*backPassDist
	else
		backRateFactor = 1
	end
		
	if biggestSector then
		rating = (rating + biggestSector * 2 * World.Geometry.FieldHeight) * distRateFactor * backRateFactor
	end
	-- log("robot " .. robot.id .. ", rating " .. rating)	
	return rating
end

return Shoot
