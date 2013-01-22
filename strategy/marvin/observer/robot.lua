local Robot = {}
local World = require "../base/world"

local lastspeed = {}
local accelerationSmoothed = {}
local alpha = 0.1
local accelerationSmoothedMax = {}

function Robot.estimateAcceleration() -- opponent robots actual and maximal acceleration estimation 
	for _, robot in pairs(World.OpponentRobots) do
		if lastspeed[robot.id] then
			local accel = (robot.speed - lastspeed[robot.id]) / World.TimeDiff -- classic derivative without smoothing
			accelerationSmoothed[robot.id] = alpha * accel + (1 - alpha) * accelerationSmoothed[robot.id] -- smoothed acceleration curve
		end
		lastspeed[robot.id]=robot.speed
		if accelerationSmoothedMax[robot.id] then
			if accelerationSmoothedMax[robot.id] < accelerationSmoothed[robot.id] then
				accelerationSmoothedMax[robot.id] = accelerationSmoothed[robot.id]
			end
		else
			accelerationSmoothedMax[robot.id] = accelerationSmothed[robot.id]
		end
	end
end

function Robot.getAcceleration(rID)
	return accelerationSmoothedMax[rID]
end

function Robot.minTimeToBall(robot, ball)
	local posDiff = robot.pos - ball.pos
	 -- only add ball speed if it moves towards us
	local ballSpeedToRobot = math.max(0, ball.speed:dot(posDiff) / posDiff:length())
	return math.max(0, posDiff:length() - robot.radius - ball.radius) / (robot.maxSpeed + ballSpeedToRobot)
end

return Robot
