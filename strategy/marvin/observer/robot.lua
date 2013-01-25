local Robot = {}
local World = require "../base/world"
local Constants = require "../base/constants"

local lastspeed = {}
local accelerationSmoothed = {}
local alpha = 0.1
local accelerationSmoothedMax = {}

function Robot.estimateAcceleration() -- opponent robots actual and maximal acceleration estimation 
	for _, robot in pairs(World.OpponentRobots) do
		if lastspeed[robot.id] then
			local accel = (robot.speed - lastspeed[robot.id]) / World.TimeDiff -- classic derivative without smoothing
			accelerationSmoothed[robot.id] = alpha * accel + (1 - alpha) * (accelerationSmoothed[robot.id] or 0) -- smoothed acceleration curve
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
	local posDiff = (ball.pos - robot.pos):normalize()
	local dist = ball.pos:distanceTo(robot.pos) - ball.radius - robot.radius
	-- speed of ball and robot towards each other
	local robotSpeed = posDiff:dot(robot.speed)
	local robotAccel = robot.maxAcceleration
	
	local ballSpeed = -posDiff:dot(ball.speed)
	local ballAccel
	if ballSpeed == 0 then -- prevent division by zero for timeBall
		ballAccel = 1 -- only used together with ballSpeed
	else
		ballAccel = (ballSpeed / ball.speed:length()) * Constants.ballDeceleration
	end
	
	-- x(t) = x0 - integral(0 to t, v_r(t) + v_b(t) dt)
	-- solve x(t) = 0 for t
	-- v_r(t) = v_r_0 + a_r*t  if t < (v_max - v_r_0)/a_r
	--          v_max          otherwise
	-- v_b(t) = v_b_0 + a_b*t  if t < v_b_0 / a_b
	--          0              otherwise
	-- a_r is robot acceleration
	-- a_b is ball deceleration along direction towards the robot
	
	-- times until full acceleration / stop and distances traveled until then
	local timeRobot = math.max(0, (robot.maxSpeed - robotSpeed) / robotAccel)
	local distRobot = robotSpeed * timeRobot + robotAccel * timeRobot^2 * 0.5
	local timeBall = math.max(0, -ballSpeed / ballAccel)
	local distBall = ballSpeed * timeBall + ballAccel * timeBall^2 * 0.5
	
	-- Solve equations for each interval and check that the result is in it
	local t = math.solveSq((robotAccel+ballAccel)*0.5, robotSpeed+ballSpeed, -dist)
	if t and t <= math.min(timeRobot, timeBall) then
		return t < 0 and 0 or t
	end
	
	if timeRobot < timeBall then
		local distLeft = dist - distRobot + timeRobot * robot.maxSpeed
		t = math.solveSq(ballAccel * 0.5, robot.maxSpeed + ballSpeed, -distLeft)
	elseif timeBall < timeRobot then
		local distLeft = dist - distBall
		t = math.solveSq(robotAccel * 0.5, robotSpeed, -distLeft)
	end
	if t and t >= math.min(timeRobot, timeBall) and t <= math.max(timeRobot, timeBall) then
		return t
	end
	
	local distLeft = dist - distRobot - distBall + timeRobot * robot.maxSpeed
	return distLeft / robot.maxSpeed
end

return Robot
