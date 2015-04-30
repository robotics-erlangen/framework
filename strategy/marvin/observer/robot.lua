local Robot = {}
local World = require "../base/world"
local Constants = require "../base/constants"
local Cache = require "../base/cache"
local Messaging = require "control/messaging"

local lastSpeed = {}
local speedSmoothed = {}
local accelerationSmoothed = {}
local alpha = 0.1


--- checks if the ball can be shot directly to another robot
-- @param target, robot - robot to which the ball corridor is being tested
-- @param shooter, robot
-- @param chipkick, bool - do not consider robots as obstacle which can be chipped over
-- @return bool - true if way is free, false otherwise
function Robot.wayToRobotFree(target, shooter, chipkick)
	return Robot.wayToPosFree(target.pos, shooter, target, chipkick)
end

local oppChipDist = 0.2 -- min distance of opponent for chipping
local recvChipDist = 0.3 -- min distance for receiving a chip pass
function Robot.wayToPosFree(pos, ignoreRobot1, ignoreRobot2, chipkick)
	-- TODO consider speed of robots to look a little into the future
	for _, robot in pairs(World.Robots) do
		if robot ~= ignoreRobot1 and robot ~= ignoreRobot2 then
			local _, distToBallCorridor = robot.pos:orthogonalProjection(World.Ball.pos, pos)
			local targetDist = World.Ball.pos:distanceTo(pos)
			local isInTheWay = math.abs(distToBallCorridor) < (robot.radius + World.Ball.radius)
				and robot.pos:distanceTo(World.Ball.pos) < targetDist
				and robot.pos:distanceTo(pos) < targetDist
			if chipkick then
				local shootBallPos = World.Ball.pos
				for _, pos in pairs(Messaging.get("attackPosition")) do
					shootBallPos = pos
				end
				isInTheWay = isInTheWay and
					(robot.pos:distanceTo(shootBallPos) > oppChipDist
					-- assuming ignoreRobot1 is the pass target
					or (ignoreRobot1 and ignoreRobot1.pos:distanceTo(robot.pos) > recvChipDist))
			end
			if isInTheWay then
				return false
			end
		end
	end
	return true
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


local function distToTime(robotSpeed, robotMaxSpeed, robotAccel, ballSpeed, ballAccel, dist)
	-- x(t) = x0 - integral(0 to t, v_r(t) + v_b(t) dt)
	-- solve x(t) = 0 for t
	-- v_r(t) = v_r_0 + a_r*t  if t < (v_max - v_r_0)/a_r
	--          v_max          otherwise
	-- v_b(t) = v_b_0 + a_b*t  if t < v_b_0 / a_b
	--          0              otherwise
	-- a_r is robot acceleration
	-- a_b is ball deceleration along direction towards the robot

	-- times until full acceleration / stop and distances traveled until then
	local timeRobot = math.max(0, (robotMaxSpeed - robotSpeed) / robotAccel)
	local distRobot = robotSpeed * timeRobot + robotAccel * timeRobot^2 * 0.5
	local timeBall = math.max(0, -ballSpeed / ballAccel)
	local distBall = ballSpeed * timeBall + ballAccel * timeBall^2 * 0.5

	-- Solve equations for each interval and check that the result is in it
	local t = math.solveSq((robotAccel+ballAccel)*0.5, robotSpeed+ballSpeed, -dist)
	if t and t <= math.min(timeRobot, timeBall) then
		return t < 0 and 0 or t
	end

	if timeRobot < timeBall then
		local distLeft = dist - distRobot + timeRobot * robotMaxSpeed
		t = math.solveSq(ballAccel * 0.5, robotMaxSpeed + ballSpeed, -distLeft)
	elseif timeBall < timeRobot then
		local distLeft = dist - distBall
		t = math.solveSq(robotAccel * 0.5, robotSpeed, -distLeft)
	end
	if t and t >= math.min(timeRobot, timeBall) and t <= math.max(timeRobot, timeBall) then
		return t
	end

	local distLeft = dist - distRobot - distBall + timeRobot * robotMaxSpeed
	return distLeft / robotMaxSpeed
end

local function straightTime(robot, ball)
	local posDiff = (ball.pos - robot.pos):normalize()
	local dist = math.max(0, ball.pos:distanceTo(robot.pos) - ball.radius - robot.radius)
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

	return distToTime(robotSpeed, robot.maxSpeed, robotAccel, ballSpeed, ballAccel, dist)
end

local SLOW_BALL = 0.5
local function sidewardsTime(robot, ball)
	-- slow ball, moving into ball shoot line isn't neccessary
	if World.Ball.speed:length() < SLOW_BALL then
		return 0
	end

	local linePos = robot.pos:orthogonalProjection(ball.pos, ball.pos + ball.speed)
	local dist = math.max(0, robot.pos:distanceTo(linePos) - ball.radius - robot.radius)

	local robotSpeed = (linePos - robot.pos):normalize():dot(robot.speed)
	local robotAccel = robot.maxAcceleration

	local ballSpeed = 0
	local ballAccel = 1

	return distToTime(robotSpeed, robot.maxSpeed, robotAccel, ballSpeed, ballAccel, dist)
end

function Robot.minTimeToBall(robot, ball)
	-- time needed to move to the ball in a straight line
	local straight = straightTime(robot, ball)
	-- time needed to move sidewards into the ball shoot line
	local sidewards = sidewardsTime(robot, ball)
	-- time to reach the ball is at least the maximum of both times
	return math.max(straight, sidewards)
end
Robot.minTimeToBall = Cache.forFrame(Robot.minTimeToBall)

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


--- approximates the time the given robot needs to pos for a given endSpeed
-- uses a bang-bang motion profile
-- calculations are done in 1D (along the line from robot.pos to pos)
function Robot.timeToPos1D(robot, pos, endSpeed)
	local accelerationFactor = 0.7 -- factor for max forward speedup and braking
	-- forward acceleration and deceleration
	local accelerate = math.abs(robot.acceleration
			and robot.acceleration.aSpeedupFMax or 1.0) * accelerationFactor
	local brake = math.abs(robot.acceleration
			and robot.acceleration.aBrakeFMax or 1.0) * accelerationFactor

	local lineDist = pos:distanceTo(robot.pos)
	local lineDir = (pos - robot.pos):normalize()
	local robotSpeed = math.min(lineDir:dot(robot.speed), robot.maxSpeed)
	local destSpeed = math.min(math.max(0, lineDir:dot(endSpeed)), robot.maxSpeed)

	local accelTime = (robot.maxSpeed - robotSpeed) / accelerate
	local brakeTime = (robot.maxSpeed - destSpeed) / brake

	local accelDist = robotSpeed * accelTime + accelerate * accelTime * accelTime / 2
	local brakeDist = destSpeed * brakeTime + brake * brakeTime * brakeTime / 2

	local remainingDist = lineDist - accelDist - brakeDist
	if remainingDist >= 0 then
		-- robot reaches full speed
		local maxSpeedTime = remainingDist / robot.maxSpeed
		return accelTime + maxSpeedTime + brakeTime
	else
		if destSpeed > robotSpeed then
			local minAccelTime = (destSpeed - robotSpeed) / accelerate
			local minAccelDist = robotSpeed * minAccelTime + accelerate * minAccelTime * minAccelTime / 2
			if minAccelDist > lineDist then
				-- won't be able to reach endSpeed
				return (-robotSpeed + math.sqrt(robotSpeed*robotSpeed+2*accelerate*lineDist)) / accelerate
			end
		elseif destSpeed < robotSpeed then
			local minBrakeTime = (robotSpeed - destSpeed) / brake
			local minBrakeDist = destSpeed * minBrakeTime + brake * minBrakeTime * minBrakeTime / 2
			if minBrakeDist > lineDist then
				-- won't be able to brake down to endSpeed
				return (-robotSpeed + math.sqrt(robotSpeed*robotSpeed-2*brake*lineDist)) / (-brake)
			end
		end

		-- braking start before reaching full speed
		-- symmetrically cut speed from maxspeed to lower speeds
		-- d = v_max - v_cut
		-- v_max(d/accel + d/brake)-accel/2*(d/accel)^2-brake/2*(d/brake)^2=-remaining
		-- solve: d^2 * (-1/(2*accel)-1/(2*brake)) + d * v_max * (1/accel + 1/brake) + remaining = 0
		local v_delta = math.solveSq(-0.5*(1/accelerate+1/brake),
				robot.maxSpeed*(1/accelerate+1/brake), remainingDist)
		accelTime = (robot.maxSpeed - v_delta - robotSpeed) / accelerate
		brakeTime = (robot.maxSpeed - v_delta - destSpeed) / brake
		return accelTime + brakeTime
	end

end

return Robot
