local Physics = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local plot = require "../base/plot"
local World = require "../base/world"


--- predicts the ball
-- @param ball Ball - a ball-like structure, must contain the fields pos, speed, maxSpeed and radius
-- @param time number - the number of seconds from now on
-- @return Ball - the predicted ball as a ball-like structure
function Physics.ballAtTime(ball, time)
	-- formulas used:
	-- v = a * t + v0
	-- t = (v - v0) / a
	-- s = 1/2 * a * t^2 + v0 * t + s0

	-- a_slide: the negative acceleration while the ball is sliding [m/s^2]
	-- a_roll: the negative acceleration while the ball is rolling [m/s^2]
	local a_slide = Constants.fastBallDeceleration
	local a_roll = Constants.ballDeceleration

	-- v_max: the speed at which the ball was shot [m/s]
	-- v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	-- v_current: the speed of the ball, now [m/s]
	local v_max = ball.maxSpeed
	local v_switch = Constants.ballSwitchRatio * v_max
	local v_current = ball.speed:length()

	-- t_switch: the moment the ball starts rolling, from now [s]
	-- s_switch: the distance the ball traveled before starting to roll [m]
	local t_switch
	local s_switch

	-- result: the ball-like returned object
	local result = {}

	-- since we don't do collision calculation, maxSpeed always stays the same
	result.maxSpeed = ball.maxSpeed
	result.radius = ball.radius

	-- the sliding stage
	if v_current > v_switch then
		t_switch = (v_switch - v_current) / a_slide
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch

		-- if "time" is in the sliding stage
		if time <= t_switch then
			local v_result = a_slide * time + v_current
			local s_result = a_slide / 2 * time * time + v_current * time
			result.speed = ball.speed:copy():setLength(v_result)
			result.pos = ball.pos + ball.speed:copy():setLength(s_result)
			return result
		end
	else
		t_switch = 0
		s_switch = 0
		v_switch = v_current
	end

	-- t_roll: how long the ball stays in the rolling stage
	local t_roll = (0 - v_switch) / a_roll

	-- if "time" is after the ball has stopped
	if time >= t_switch + t_roll then
		local s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
		result.speed = Vector.create(0, 0)
		result.pos = ball.pos + ball.speed:copy():setLength(s_result)
		return result
	end

	-- if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch

	local v_result = a_roll * t_roll + v_switch
	local s_result = a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
	result.speed = ball.speed:copy():setLength(v_result)
	result.pos = ball.pos + ball.speed:copy():setLength(s_result)
	return result
end


--- estimates the time the ball needs to travel a given distance
-- the estimation does not exceed ballStopTime() unless the distance is too large, then it returns math.huge
-- @param ball Ball - a ball-like structure
-- @param distance number - the distance in meter
-- @return number - the estimated time
function Physics.ballRollTime(ball, distance)
	-- a_slide: the negative acceleration while the ball is sliding [m/s^2]
	-- a_roll: the negative acceleration while the ball is rolling [m/s^2]
	local a_slide = Constants.fastBallDeceleration
	local a_roll = Constants.ballDeceleration

	-- v_max: the speed at which the ball was shot [m/s]
	-- v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	-- v_current: the speed of the ball, now [m/s]
	local v_max = ball.maxSpeed
	local v_switch = Constants.ballSwitchRatio * v_max
	local v_current = ball.speed:length()

	-- t_switch: the moment the ball starts rolling, from now [s]
	-- s_switch: the distance the ball traveled before starting to roll [m]
	local t_switch
	local s_switch

	local epsilon = 0.000001

	-- ensure that the distance parameter is positive
	if distance <= epsilon then
		return 0
	end

	-- the sliding stage
	if v_current > v_switch then
		t_switch = (v_switch - v_current) / a_slide
		s_switch = a_slide / 2 * t_switch * t_switch + v_current * t_switch

		if distance < s_switch then
			-- a_slide/2 * t^2 + v_current * t - distance = 0
			local t_result = math.solveSq(a_slide / 2, v_current, -distance + epsilon);
			return t_result
		end
	else
		t_switch = 0
		s_switch = 0
		v_switch = v_current
	end

	local s_roll = distance - s_switch
	-- a_roll/2 * t^2 + v_switch * t - s_roll = 0
	local t_roll = math.solveSq(a_roll / 2, v_switch, -s_roll + epsilon) or math.huge

	local t_result = t_switch + t_roll
	return t_result
end

--- estimates the time the ball needs to travel to a given position
-- checks if the position lies in front of the ball +- 90 degrees
-- if the pos is behind the ball, negative infinity is returned
function Physics.checkedBallRollTime(ball, pos)
	local toPos = pos - ball.pos
	if ball.speed:dot(toPos) > 0 then
		local distance = ball.pos:distanceTo(pos)
		return Physics.ballRollTime(ball, distance)
	end
	return -math.huge
end


--- calculates the time the ball needs to fully stop
-- @param ball Ball - a ball-like structure
-- @return number - the estimated stop time
function Physics.ballStopTime(ball)
	-- a_slide: the negative acceleration while the ball is sliding [m/s^2]
	-- a_roll: the negative acceleration while the ball is rolling [m/s^2]
	local a_slide = Constants.fastBallDeceleration
	local a_roll = Constants.ballDeceleration

	-- v_max: the speed at which the ball was shot [m/s]
	-- v_switch: the speed of the ball at the moment where the ball starts rolling [m/s]
	-- v_current: the speed of the ball, now [m/s]
	local v_max = ball.maxSpeed
	local v_switch = Constants.ballSwitchRatio * v_max
	local v_current = ball.speed:length()

	local t_slide = 0
	local v_roll = v_current
	if v_current > v_switch then
		t_slide = (v_switch - v_current) / a_slide
		v_roll = v_switch
	end

	local t_roll = (0 - v_roll) / a_roll

	return t_slide + t_roll
end

--- calculates the time the ball needs to cross the field border
-- @param ball Ball - a ball-like structure
-- @param [offset number - additional offset to move field lines further outwards]
-- @return number - the estimated out time
function Physics.ballOutTime(ball, offset)
	if ball.speed:length() < 0.01 then
		return math.huge
	end
	local lineCut = Field.nextLineCut(ball.pos, ball.speed, offset)
	local distToLine = ball.pos:distanceTo(lineCut)
	return Physics.ballRollTime(ball, distToLine)
end
Physics.ballOutTime = Cache.forFrame(Physics.ballOutTime)


--- first position where the ball will hit the ground again
-- @param ball Ball - a ball-like structure
-- @return Vector - the estimated landing position
function Physics.ballLandPos(ball)
	local topHeight = math.max(0, ball.posZ + ball.speedZ * ball.speedZ / (2 * 9.81))
	local timeToTop = ball.speedZ / 9.81
	local timeToFloor = math.sqrt(2 * topHeight / 9.81)

	local remainingFlightTime = math.max(0, timeToTop + timeToFloor)
	return ball.pos + ball.speed * remainingFlightTime
end


--- approximates the time the given robot needs to pos for a given endSpeed
-- uses a bang-bang motion profile
-- calculations are done in 1D (along the line from robot.pos to pos)
-- @param robot Robot
-- @param pos Vector - the destination
-- @param endSpeed Vector - the maximal velocity the robot is allowed to have in the given direction
-- @param brakeAndReturn - setting this to true, the robot will brake to stop and return to pos, if it would be faster than endSpeed.
-- Warning! This can cause severe numerical instabilities if endSpeed points from robot.pos to pos and the robot is a bit too fast
-- Then the robot must do a full stop and return to pos with zero endSpeed!
-- @param lowAccel - assume reduced acceleration
-- @return number - the estimated time
function Physics.robotTimeToPos(robot, pos, endSpeed, brakeAndReturn, lowAccel)
	local accelerationFactor = lowAccel and 0.7 or 0.9 -- factor for max forward speedup and braking
	local tolerance = 0.01 -- cutoff low distances to prevent instabilities
	-- forward acceleration and deceleration
	local accelerate = math.abs(robot.acceleration
			and robot.acceleration.aSpeedupFMax or 1.0) * accelerationFactor
	local brake = math.abs(robot.acceleration
			and robot.acceleration.aBrakeFMax or 1.0) * accelerationFactor

	local lineDist = math.max(pos:distanceTo(robot.pos) - tolerance, 0)
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
		if destSpeed >= robotSpeed then
			local minAccelTime = (destSpeed - robotSpeed) / accelerate
			local minAccelDist = robotSpeed * minAccelTime + accelerate * minAccelTime * minAccelTime / 2
			if minAccelDist >= lineDist then
				-- won't be able to reach endSpeed
				return (-robotSpeed + math.sqrt(robotSpeed*robotSpeed+2*accelerate*lineDist)) / accelerate
			end
		elseif destSpeed <= robotSpeed then
			local minBrakeTime = (robotSpeed - destSpeed) / brake
			local minBrakeDist = destSpeed * minBrakeTime + brake * minBrakeTime * minBrakeTime / 2
			if minBrakeDist >= lineDist then
				if not brakeAndReturn then
					-- won't be able to brake down to endSpeed
					return (-robotSpeed + math.sqrt(robotSpeed*robotSpeed-2*brake*lineDist)) / (-brake)
				end

				-- create a fake robot at the position where the robot is able to brake
				local fakeRobot = {
					acceleration = robot.acceleration,
					pos = robot.pos + lineDir * minBrakeDist,
					maxSpeed = robot.maxSpeed,
					speed = Vector(0, 0)
				}
				return minBrakeTime + Physics.robotTimeToPos(fakeRobot, pos, endSpeed)
			end
		end

		-- braking start before reaching full speed
		-- symmetrically cut speed from maxspeed to lower speeds
		-- d = v_max - v_cut
		-- v_max(d/accel + d/brake)-accel/2*(d/accel)^2-brake/2*(d/brake)^2=-remaining
		-- solve: d^2 * (-1/(2*accel)-1/(2*brake)) + d * v_max * (1/accel + 1/brake) + remaining = 0
		local v_delta = math.solveSq(-0.5*(1/accelerate+1/brake),
				robot.maxSpeed*(1/accelerate+1/brake), remainingDist)
		if not v_delta then
			-- b^2 - 4*a*c < 0 -> rounding error
			v_delta = robot.maxSpeed
		end
		accelTime = (robot.maxSpeed - v_delta - robotSpeed) / accelerate
		brakeTime = (robot.maxSpeed - v_delta - destSpeed) / brake
		return accelTime + brakeTime
	end
end


--- calculates the min endspeed for the robot to reach pos in the given time
-- @param robot Robot
-- @param pos Vector
-- @param time number
-- @return Vector - the endspeed vector (in the direction from robot to pos)
function Physics.robotMinEndspeed(robot, pos, time)
	local direction = (pos - robot.pos):normalize()
	local maxSpeed = robot.maxSpeed

	-- as slow as possible
	local minTime = Physics.robotTimeToPos(robot, pos, Vector(0, 0))
	if minTime < time then
		-- the robot has more than enough time
		return Vector(0, 0)
	end

	-- as fast as possible
	local maxTime = Physics.robotTimeToPos(robot, pos, direction * maxSpeed)
	if maxTime > time then
		-- the robot cannot make it in time
		return direction * maxSpeed
	end

	-- binary search
	-- resolution
	local epsilon_v = 0.05

	local v = maxSpeed / 2
	local delta_v = maxSpeed / 4

	while delta_v > epsilon_v do
		local t = Physics.robotTimeToPos(robot, pos, direction * v)
		if t < time then
			v = v - delta_v
		else
			v = v + delta_v
		end
		delta_v = delta_v / 2
	end

	return direction * v
end


--- calculates the time the robot needs to move to the position next to the ball at given t_ball
function Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball)
	local x_ball = Physics.ballAtTime(ball, t_ball).pos
	local offset = (x_ball - targetPos):setLength(ball.radius + robot.shootRadius)
	local x_robot = x_ball + offset

	-- anywhere on the dribbler is okay, not only the center
	local dribblerHalf = (targetPos - x_ball):perpendicular():setLength(robot.dribblerWidth / 2)
	x_robot = robot.pos:nearestPosOnLine(x_robot + dribblerHalf, x_robot - dribblerHalf)

	-- calculate and save the robot time
	local endSpeed = (x_robot - robot.pos):setLength(endSpeedLength)
	return Physics.robotTimeToPos(robot, x_robot, endSpeed, true)
end

--- calculates the time the robot takes to reach the ball (in a controlled fashion)
-- @param robot Robot - the robot
-- @param ball Ball - a ball-like structure
-- @param targetPos - the position the robot will look at
-- @param endSpeedLength - the maximal velocity of the robot when reaching the destination
-- @return number - the estimated time
function Physics.robotTimeToBall(robot, ball, targetPos, endSpeedLength)
	--local time0 = amun.getCurrentTime()
	-- if the ball is extremely slow, consider it as stationary
	if ball.speed:length() < 0.01 then
		local endSpeed = (ball.pos - robot.pos):setLength(endSpeedLength)
		local result = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, 0)
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("robotTimeToBall", time1 - time0)
		return result
	end

	-- calculate time required when the robot is directly hit by the ball
	local frontOffset = (targetPos - robot.pos):setLength(ball.radius + robot.shootRadius)
	local ballHitPos, _, lambda = geom.intersectLineLine(ball.pos, ball.speed,
			robot.pos + frontOffset, ball.speed:perpendicular():normalize())
	local ballTimeToHitPos = Physics.ballRollTime(ball, ball.pos:distanceTo(ballHitPos))
	local robotTimeToHitPos = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, ballTimeToHitPos)

	-- calculate the time the ball needs to cross the field border
	local t_out = Physics.ballOutTime(ball)

	-- calculate the time until the ball stops
	local t_stop = Physics.ballStopTime(ball)

	-- upper bound for sampling and binary search
	local t_max = math.min(t_out, t_stop)
	-- catch ball at nearest point on ball move line, if that's possible
	-- this stabilizes the calculation if the ball is going to hit the robot soon
	-- !!! optimistic: assumes that the robot can't be too fast to catch the ball
	if robotTimeToHitPos <= ballTimeToHitPos then
		t_max = math.min(ballTimeToHitPos, t_max)
	end

	-- special case: when the ball is fast and will soon hit the dribbler
	-- just use the ballTimeToHitPos. This is necessary as the timespan during which
	-- the t_ball > t_robot is getting smaller and smaller the distance between ball and robot gets
	-- In the end the sampling is no longer able to find a valid time
	-- The instability is increased as predicting the fasted position
	-- where to catch the ball on the dribber gets more important.
	if math.abs(lambda) < robot.dribblerWidth/2+0.01 and ballTimeToHitPos < 0.25
			and ball.speed:dot(ballHitPos - ball.pos) > 0 then
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("robotTimeToBall", time1 - time0)
		if ballTimeToHitPos <= t_max then
			return ballTimeToHitPos
		else
			return math.huge
		end
	end

	-- ===== quadratic sampling =====

	local N_SAMPLES = 10

	local robot_times = {}
	local ball_times = {}

	for i = 1, N_SAMPLES do
		-- calculate interval
		local i_normalized = (i-1) / (N_SAMPLES-1)
		local step_quadratic = 0.5 * i_normalized * i_normalized + 0.5 * i_normalized
		local t_ball = step_quadratic * t_max
		local t_robot = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball)
		table.insert(ball_times, t_ball)
		table.insert(robot_times, t_robot)
	end

	-- the curve of (t_robot - t_ball) has up to 2 maxima
	-- the first one occurs at the point where the robot actively catches the ball
	-- the second one is the point where the robot moves to the slow or resting ball
	-- check if the first maximum is > 0 (if it exists)
	local MAXSEARCH_N_SAMPLES = 7

	local t_ball_bsearch_start = nil
	local t_ball_bsearch_end = nil
	for i = 2, N_SAMPLES do
		-- search the first zero crossing
		local timediff0 = ball_times[i-1] - robot_times[i-1]
		local timediff1 = ball_times[i] - robot_times[i]
		if timediff0 <= 0 and timediff1 >= 0 then
			t_ball_bsearch_start = ball_times[i-1]
			t_ball_bsearch_end = ball_times[i]
			break
		end
	end

	-- if the robot is always slower than the ball
	-- either return the time to the stationary ball
	-- or if the ball is too fast, the robot cannot catch it at all
	if not t_ball_bsearch_start then
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("robotTimeToBall", time1 - time0)
		if t_stop < t_out then
			return robot_times[N_SAMPLES]
		else
			return math.huge
		end
	end


	-- ===== binary search =====

	-- time resolution, for a ball with 5m/s, the error may be up to 1 cm
	local epsilon_t = 0.002

	-- initialize binary search variables
	local delta_t = (t_ball_bsearch_end - t_ball_bsearch_start) / 4
	local t_ball = t_ball_bsearch_start + delta_t * 2

	-- search for optimal time
	while delta_t > epsilon_t do
		local t_robot = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball)

		-- update search interval
		if t_robot > t_ball then
			t_ball = t_ball + delta_t
		else
			t_ball = t_ball - delta_t
		end
		delta_t = delta_t / 2
	end

	--local time1 = amun.getCurrentTime()
	--plot.aggregate("robotTimeToBall", time1 - time0)
	return t_ball
end

return Physics
