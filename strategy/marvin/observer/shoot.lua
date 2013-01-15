local Shoot = {}

local Constants = require "../base/constants"
local World = require "../base/world"
local Settings = require "settings"
local Robot = require "observer/robot"
local Ball = require "observer/ball"


--- Calculates the chance that a pass to the targetRobot will succeed
-- in terms of opponent robots catching the ball
-- @param targetRobot Robot - the robot that should receive the pass
-- @param shootTime number - the time when the ballie shoots
-- [@param targetPos Vector - the position where the pass should be received]
function Shoot.evaluateCorridor(targetRobot, shootTime, targetPos)
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

--- Calculates the chance that a chipped pass to the targetRobot will succeed in terms of opponent robots catching the ball
-- @param targetRobot Robot - the robot that should receive the pass
-- @param shootTime number - the time when the ballie shoots
-- [@param targetPos Vector - the position where the pass should be received]
function Shoot.evaluateChipCorridor(targetRobot, shootTime, targetPos)
	--TODO: test
	if (targetPos - ballPos):length() > 2 * liftDistance + targetRobot.radius then
		local corridorWidthHalf = World.Ball.radius + Constants.positionError	

		targetPos = targetPos or targetRobot.trajectory:predictPos(shootTime)		--FIXME add time needed to reach target
		local ballPos = Ball.atTime(shootTime)

		local corridorHalf = (targetPos - ballPos):perpendicular():setLength(corridorWidthHalf)

		local passChance = 1
		for _, robot in pairs(World.OpponentRobots) do
			local x = (targetPos - ballPos):setLength(liftDistance)			--liftDistance ist the distance, the ball 														needs to be able to fly over robots 														TODO test liftDistance
			local pointOnLine = geom.nearestPosOnLine(robot.pos, ballPos, ballPos + x)
			local ballCatchTime = shootTime + Shoot.ballPassTime(ballPos, targetRobot, targetPos, (ballPos - pointOnLine):length())
			local ballCatchProbability = Shoot.ballCatchProbability(robot, ballCatchTime, pointOnLine, corridorHalf)
			passChance = passChance * (1 - ballCatchProbability)
	
			local pointOnLine = geom.nearestPosOnLine(robot.pos, targetPos - x, targetPos)
			local ballCatchTime = shootTime + Shoot.ballPassTime(ballPos, targetRobot, targetPos, (ballPos - pointOnLine):length())
			local ballCatchProbability = Shoot.ballCatchProbability(robot, ballCatchTime, pointOnLine, corridorHalf)
			passChance = passChance * (1 - ballCatchProbability)
		end
	else 
		Shoot.evaluateCorridor(targetRobot, targetPos, shootTime)
	end
	return passChance
end

--- Calculates how long the ball will take when passed to travel the given distance
-- @param futureBallPos Vector - where the ball will be when we shoot
-- @param targetRobot Robot - the pass target
-- @param targetPos Vector - where the targetRobot will be
-- @param distance number - the distance
function Shoot.ballPassTime(futureBallPos, targetRobot, targetPos, distance) 
	local passDistance = (targetPos - futureBallPos):length()
	local v = targetRobot.calculateShootSpeed(targetRobot.constants.passSpeed, passDistance)
	return Ball.ballRollTime(v, distance)
end
 
--- Calculates the probability that the given opponent robot catches the ball
-- @param robot Robot - opponent robot
-- @param time number - how long the robot can move until the ball reaches the given position
-- @param catchPos Vector - where the robot might catch the ball
-- @param corridorHalf Vector - the ball can only be catched in [catchPos-corridorHalf, catchPos+corridorHalf]
function Shoot.ballCatchProbability(robot, time, catchPos, corridorHalf)
	local corridorWidthHalf = corridorHalf:length()
	local v_toSector = math.abs(robot.speed:dot(corridorHalf:normalize())) -- part of robot.speed perpendicular to shoot corridor
	local maxAcceleration = 3 -- magic constant
	local maxDeceleration = 5 -- magic constant
	local expectedPos = v_toSector*time -- position, which the robot reaches without changing speed
	local startReachSector = expectedPos - robot.radius - corridorWidthHalf
	local exitSector = expectedPos + robot.radius + corridorWidthHalf
	local furthestTarget = exitSector + 0.5*maxAcceleration*time^2 -- position, which the front of the robot covers with maxAcceleration
	local nearestTarget = startReachSector - 0.5*maxDeceleration*time^2 -- position, which the back of the robot covers with maxDeceleration
	
	local function _P(x)
		if x <= nearestTarget or x >= furthestTarget then
			return 0
		end
		if x < startReachSector then
			return (0.5*maxAcceleration*time^2)^(-2)*(x - nearestTarget)^2 -- right half of a parable
		elseif x < exitSector then
			return 1 -- constant 1
		else
			return (0.5*maxDeceleration*time^2)^(-2)*(x - furthestTarget)^2 -- left half of a parable
		end
	end -- continuous function that rates a point on a line perpendicular to the shoot corridor
	
	local distToSector = (robot.pos - catchPos):length()
	return math.max(_P(distToSector + robot.radius + corridorWidthHalf), _P(distToSector - robot.radius - corridorWidthHalf)) -- rate both edges of the shoot corridor
	-- the higher probability is the one that the opponents desire -> return the higher probability
end

return Shoot
