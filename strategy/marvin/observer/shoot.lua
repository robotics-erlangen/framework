local Shoot = {}

local Field = require "../base/field"
local World = require "../base/world"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"


local function assistantOrder(r1, r2)
	return Shoot.rateAssistant(r1) > Shoot.rateAssistant(r2)
end

--- returns nil or a robot which can be passed to and, if there a more of them, the one who is closest to the opponent goal in combination with the biggest free goal sectors
-- @param activeRobot - the robot who is searching for a pass receiver
-- @param attackerMap - map with robots as key, must have a value equivalent to true
-- @return robot or nil - the most suitable robot, if any
function Shoot.bestFreeAssistant(activeRobot, attackerMap)
	-- !!! ATTENTION !!! Assumes we are already at the ball
	local freeAssistants = {}
	for _, r in ipairs(World.FriendlyRobots) do
		if r ~= activeRobot and attackerMap[r]
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

function Shoot.ballPassTime(ball, passPos, targetRobot, destSpeedLength)
	local dist = ball.pos:distanceTo(passPos)
	destSpeedLength = destSpeedLength or targetRobot.constants.passSpeed
	local shootSpeed = targetRobot:calculateShootSpeed(destSpeedLength, dist)
	local shootBall = {
		pos = ball.pos,
		speed = (passPos - ball.pos):setLength(shootSpeed),
		maxSpeed = shootSpeed,
		radius = ball.radius
	}
	return Physics.ballRollTime(shootBall, dist)
end

return Shoot
