local Shoot = {}


local World = require "../base/world"
local Settings = require "settings"
local Robot = require "observer/robot"

-- Idee: statt boolschen Wert eine Wahrscheinlichkeit zurueckgeben
-- gegner kann beschleunigen/bremsen
-- dreieckige Wahrscheinlichkeitsverteilung fuer die zukuenftige Position
-- ueber Schnittmenge mit dem Korridor kann man Wahrscheinlichkeit dafuer berechnen,
-- 		dass der Gegner den Ball abfaengt
-- Gesamtwahrscheinlichkeit fuer den Erfolg des Passes
-- = Produkt ueber (1 - Abfangwahrscheinlichkeit_i)
function Shoot.checkCorridor(targetRobot, shootTime)
	-- TODO: test
	local corridorWidthHalf = World.Ball.radius + Constants.positionError
	local corridorHalf = (targetRobot.pos - World.Ball.radius):perpendicular():setLength(corridorWidthHalf)
	local passChance = 1
	for _, robot in pairs(World.OpponentRobots) do
		local pointOnLine = geom.nearestPosOnLine(robot.pos, World.Ball.pos, targetRobot.pos)
		local ballCatchTime = shootTime + Shoot.ballRollTime(targetRobot, (World.Ball.pos - pointOnLine):length())
		local ballCatchProbability = Shoot.ballCatchProbability(robot, ballCatchTime, pointOnLine, corridorHalf)
		passChance = passChance * (1 - ballCatchProbability)
	end
	return passChance
end

--- Calculates how long the ball will take when passed to travel the given distance
-- @param targetRobot Robot - the pass target
-- @param distance number - the distance
function Shoot.ballRollTime(targetRobot, distance) 
	local a = Constants.ballDeceleration
	local passDistance = (targetRobot.pos - World.Ball.pos):length()
	local v = targetRobot.calculateShootSpeed(targetRobot.passSpeed, passDistance)
	local discriminant = v*v + 2*a*distance
	if discriminant < 0 then -- should never happen
		error("Observer.Shoot.ballRollTime: invalid distance")
		return math.huge
	end
	local discriminantRoot = math.sqrt(discriminant)
	local t1 = (-v + discriminantRoot)/(2*a)
	local t2 = (-v - discriminantRoot)/(2*a)
	if t1 > 0 then
		return t1
	else if t2 > 0 then
		return t2
	else
		return math.huge
	end
end
 
--- Calculates the probability that the given opponent robot catches the ball
-- @param robot Robot - opponent robot
-- @param time number - how long the robot can move until the ball reaches the given position
-- @param catchPos Vector - where the robot might catch the ball
-- @param corridorHalf Vector - the ball can only be catched in [catchPos-corridorHalf, catchPos+corridorHalf]
function Shoot.ballCatchProbability(robot, time, catchPos, corridorHalf)
	local corridorWidthHalf = corridorHalf:length()
	local v_toSector = abs(robot.speed:dot(corridorHalf:normalize()))
	local maxAcceleration = 3 -- magic constant
	local maxDeceleration = 5 -- magic constant
	local expectedPos = v_toSector*time
	local startReachSector = expectedPos - robot.radius - corridorWidthHalf
	local exitSector = expectedPos + robot.radius + corridorWidthHalf
	local furthestTarget = exitSector + 0.5*maxAcceleration*time^2
	local nearestTarget = startReachSector - 0.5*maxDeceleration*time^2
	local function _P(x)
		if x > nearestTarget and x < furthestTarget then
			if x < startReachSector then
				return (0.5*maxAcceleration*time^2)^(-2)*(x - nearestTarget)^2
			else if x < exitSector then
				return 1
			else
				return (0.5*maxDeceleration*time^2)^(-2)*(x - furthestTarget)^2
			end
		else
			return 0
		end
	end
	distToSector = (robot.pos - catchPos):length()
	return max(_P(distToSector+robot.radius+corridorWidthHalf), _P(distToSector-robot.radius-corridorWidthHalf))
end

return Shoot