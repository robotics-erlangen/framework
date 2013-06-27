local Shoot = {}

local Constants = require "../base/constants"
local World = require "../base/world"
local Settings = require "settings"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Geom = require "../base/geom"
local Field = require "util/field"


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
		local ballCatchTime = shootTime + Shoot.ballPassTime(predictedBallState.pos, targetRobot, targetPos, (predictedBallState.pos - pointOnLine):length())
		local ballCatchProbability = Shoot.ballCatchProbability(robot, ballCatchTime, pointOnLine, corridorHalf)
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
		local ballCatchTime = shootTime + ballRollTime
		local ballCatchProbability = Shoot.ballCatchProbability(r, ballCatchTime, pointOnLine, corridorHalf)
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
			local ballCatchTime = shootTime + Shoot.ballPassTime(ballPos, targetRobot, targetPos, (ballPos - pointOnLine):length())
			local ballCatchProbability = Shoot.ballCatchProbability(robot, ballCatchTime, pointOnLine, corridorHalf)
			passChance = passChance * (1 - ballCatchProbability)
	
			local pointOnLine = Geom.nearestPosOnLine(robot.pos, targetPos - x, targetPos)
			local ballCatchTime = shootTime + Shoot.ballPassTime(ballPos, targetRobot, targetPos, (ballPos - pointOnLine):length())
			local ballCatchProbability = Shoot.ballCatchProbability(robot, ballCatchTime, pointOnLine, corridorHalf)
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
 
--- Calculates the probability that the given opponent robot catches the ball
-- @param robot Robot - opponent robot
-- @param time number - how long the robot can move until the ball reaches the given position
-- @param catchPos Vector - where the robot might catch the ball
-- @param corridorHalf Vector - the ball can only be catched in [catchPos-corridorHalf, catchPos+corridorHalf]
-- @return catchProbability number - the chance that the given opponent robot catches the ball
function Shoot.ballCatchProbability(robot, time, catchPos, corridorHalf)
	local corridorWidthHalf = corridorHalf:length()
	local distToCorridor = (robot.pos - catchPos):length()
	local maxAcceleration = robot.maxAcceleration
	local maxDeceleration = -5 -- magic constant
	local v_toSector = math.abs(robot.speed:dot(corridorHalf)/corridorWidthHalf) -- part of robot.speed perpendicular to shoot corridor
	local expectedPos = v_toSector*time -- position, which the robot reaches without changing speed
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
	local neededAcc = 2*(d0 - expectedPos)/(time*time)	-- min acceleration or deceleration to reach the sector
	if flagAcc then
		if neededAcc >= maxAcceleration then
			return 0
		else
			return math.sqrt((maxAcceleration - neededAcc)/maxAcceleration)
		end
	else
		if neededAcc <= maxDeceleration then
			return 0
		else
			return math.sqrt((maxDeceleration - neededAcc)/maxDeceleration)
		end
	end
end

--- returns nil or a robot which can be passed to and, if there a more of them, the one who is closest to the opponent goal in combination with the biggest free goal sectors
-- @param activeRobot - the robot who is searching for a pass receiver
-- @param messages - the messages object of a behaviour
-- @return robot or nil - the most suitable robot, if any 
function Shoot.bestFreeAssistant(activeRobot, messages)
	-- !!! ATTENTION !!! Assumes we are already at the ball 
	local function canPassTo(r)
		return messages[r] and messages[r].task.assistantRating and Field.isInField(r.pos)
			and Robot.wayToRobotFree(r, activeRobot)
	end
	
	local freeAssistants = table.filter(World.FriendlyRobots, canPassTo)
	table.sort(freeAssistants, function(r1,r2) return Shoot.rateAssistant(r1) > Shoot.rateAssistant(r2) end)
	return freeAssistants[1]
end

function Shoot.rateAssistant(robot)
	local fs = Goal.freeSectors(robot.pos, World.OpponentRobots, true)
	local biggestSector = table.max(table.map(fs, function(s) return s[2]-s[1] end))
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
		backRateFactor = 0
	end
		
	if biggestSector then
		rating = (rating + biggestSector * 2 * World.Geometry.FieldHeight) * distRateFactor * backRateFactor
	end
	-- log("robot " .. robot.id .. ", rating " .. rating)	
	return rating
end

return Shoot
