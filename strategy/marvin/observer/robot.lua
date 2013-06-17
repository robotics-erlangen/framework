local Robot = {}
local World = require "../base/world"
local Constants = require "../base/constants"

local lastSpeed = {}
local speedSmoothed = {}
local accelerationSmoothed = {}
local alpha = 0.1


--- checks if the ball can be shot directly to another robot
-- @param target, robot - robot to which the ball corridor is being tested
-- @param ignoreRobot, robot - the robot to shoot the ball is not considered to be an obstacle
-- @return bool - true if way is free, false otherwise
function Robot.wayToRobotFree(target, ignoreRobot)
	-- TODO consider speed of robots to look a little into the future
	local isFree = true
	for _, robot in pairs(table.combine(World.FriendlyRobots, World.OpponentRobots)) do
		if robot ~= ignoreRobot and robot ~= target then
			local _, distToBallCorridor = robot.pos:orthogonalProjection(World.Ball.pos, target.pos)
			isFree = isFree and (math.abs(distToBallCorridor) > (robot.radius + World.Ball.radius))
		end
	end
	return isFree
end


function Robot.estimateOpponentDynamics()
	for _, robot in pairs(World.OpponentRobots) do
		if lastSpeed[robot] then
			local accel = (robot.speed - lastSpeed[robot]) / World.TimeDiff -- classic derivative without smoothing
			accelerationSmoothed[robot] = alpha * accel:length() + (1 - alpha) * (accelerationSmoothed[robot] or 0) -- smoothed acceleration curve
		end
		speedSmoothed[robot] = alpha * robot.speed:length() + (1 - alpha) * (speedSmoothed[robot] or 0)
		lastSpeed[robot] = robot.speed
		
		if accelerationSmoothed[robot] and robot.maxAcceleration < accelerationSmoothed[robot] then
			robot.maxAcceleration = accelerationSmoothed[robot]
		end
		if robot.maxSpeed < speedSmoothed[robot] then
			robot.maxSpeed = speedSmoothed[robot]
		end
	end
end

local hadBallTimes = {}
function Robot.hadBall(robot, time)
	return hadBallTimes[robot] and World.Time - hadBallTimes[robot] <= time
end

function Robot._updateHadBall()
	for _,r in pairs(World.Robots) do
		if r:hasBall(World.Ball) then
			hadBallTimes[r] = World.Time
		end
	end
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

-- just an approximation
function Robot.timeToPos(robot, pos)
	local moveDir = pos - robot.pos -- assume robot moves directly towards the target
	local moveLen = moveDir:length()
	local moveTime = moveLen / robot.maxSpeed
	if moveLen > robot.maxSpeed then -- use move len as assumed speed
		moveDir:setLength(robot.maxSpeed) -- v_max
	end
	-- v(t) = a_max * t -- movement speed of robot towards it's target. Not fully exact as
	-- the robot may be moving sidewards, but should be good enough for an estimation
	
	-- move to target, but not faster then the robot is capable to drive
	-- v_max = (p_dest - p_cur):setLength(min(robot.v_max, distToGo)) -- robot won't move with full speed, if near target
	-- delta_v = v_max - v_cur -- required direction change
	-- t_accel = |delta_v|/a_max -- time required to accelerate
	-- t_end = v_max/a_max -- time when the acceleration stops
	-- d_travel = integrate v(t)dt from (t_end-t_accel) to (t_end) -- distance travelled while accelerating.
	-- Accounts for robot movment into the wrong direction intially
	-- solve integrate v_max dt from (0) to (t_min) = d_travel -- time needed for distance if moving with full speed
	-- t_extra = t_accel - t_min = |delta_v|^2/(2*a_max*v_max) -- extra time needed for accelerating
	
	-- if there's no obstacle and were driving towards the target
	-- then accelTime is nearly zero
	-- if we have to avoid an obstacle our direction doesn't match what
	-- is expected thus some time penalty is applied
	local accelTime = moveDir:distanceTo(robot.speed)^2 / (2 * robot.maxAcceleration * robot.maxSpeed)
	
	return moveTime + accelTime
end

return Robot
