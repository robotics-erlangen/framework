local Physics = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local plot = require "../base/plot"
local World = require "../base/world"
local debug = require "../base/debug"
local Robot -- = require "../observer/robot" -- cyclic dependency


--- Calculates the parameters for the switch between sliding and rolling
-- @param ball Ball - a ball-like structure, must contail the fields pos, speed and maxSpeed
-- @return number - the switch time
-- @return number - the absolute ball speed at switch time
-- @return number - the distance the ball travels until switch time
function Physics.ballSwitchParameters(ball)
	local a_slide = Constants.fastBallDeceleration
	local a_roll = Constants.ballDeceleration
	local v_max = ball.maxSpeed
	local v_switch = Constants.ballSwitchRatio*v_max
	local v_current = ball.speed:length()
	local t_switch, s_switch
	if v_current > v_switch then
		t_switch = (v_switch - v_current)/a_slide
		s_switch = (v_current + 0.5*a_slide*t_switch)*t_switch
	else
		t_switch = (v_switch - v_current)/a_roll
		s_switch = (v_current + 0.5*a_roll*t_switch)*t_switch
	end
	return t_switch, v_switch, s_switch
end

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

--- predicts how far the ball will travel in the given time
-- this is almost the same as Physics.ballAtTime, but it's a bit faster as it doesn't have to care about vectors and end speed
-- @param ball Ball - a ball-like structure, must contain the fields pos, speed, maxSpeed and radius
-- @param time number - the number of seconds from now on
-- @return number - the predicted ball travel distance
function Physics.ballTravelledDistance(ball, time)
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
			return a_slide / 2 * time * time + v_current * time
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
		return a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
	end

	-- if the ball is still in the rolling stage at time "time", change t_roll accordingly
	t_roll = time - t_switch

	return a_roll / 2 * t_roll * t_roll + v_switch * t_roll + s_switch
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

local function rttbSpecialCases(robot, ball, targetPos, endSpeedLength, t_max, t_out)
	-- calculate time required when the robot is directly hit by the ball
	local frontOffset = (targetPos - robot.pos):setLength(ball.radius + robot.shootRadius)
	local ballHitPos, _, lambda = geom.intersectLineLine(ball.pos, ball.speed,
			robot.pos + frontOffset, ball.speed:perpendicular():normalize())
	local ballTimeToHitPos = Physics.ballRollTime(ball, ball.pos:distanceTo(ballHitPos))
	local robotTimeToHitPos = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, ballTimeToHitPos)

	-- catch ball at nearest point on ball move line, if that's possible
	-- this stabilizes the calculation if the ball is going to hit the robot soon
	-- !!! optimistic: assumes that the robot can't be too fast to catch the ball
	if robotTimeToHitPos <= ballTimeToHitPos then
		t_max = math.min(ballTimeToHitPos, t_max)
	end

	-- Special case: Ball seems to be a bit inside the robot
	-- This happens because the tracking doesn't implement a ball collision modell
	if Robot == nil then
		Robot = require "observer/robot"
	end
	local relpos = (ball.pos - robot.pos):rotate(-robot.dir)
	relpos.x = relpos.x - robot.shootRadius - ball.radius
	local sidewardsOffset = math.abs(relpos.y)
	if Robot.touchedBall(robot, 0.15) and relpos.x > -0.25 and relpos.x <= 0.05 and sidewardsOffset < 0.2 then
		return nil, 0
	end

	-- special case: when the ball is fast and will soon hit the dribbler
	-- just use the ballTimeToHitPos. This is necessary as the timespan during which
	-- the t_ball > t_robot is getting smaller and smaller the distance between ball and robot gets
	-- In the end the sampling is no longer able to find a valid time
	-- The instability is increased as predicting the fasted position
	-- where to catch the ball on the dribber gets more important.
	if math.abs(lambda) < robot.dribblerWidth/2+0.01 and ballTimeToHitPos < 0.25
			and ball.speed:dot(ballHitPos - ball.pos) > 0 then
		if ballTimeToHitPos <= t_max then
			return nil, ballTimeToHitPos
		else
			return nil, math.huge
		end
	end

	-- ball moves away from the robot
	if t_out < math.huge and ball.speed:dot(ball.pos - robot.pos) > 0 then
		-- try to catch the ball inside the field
		local robotTimeToBorder = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_out)
		if robotTimeToBorder > t_out then
			return nil, math.huge
		end
	end

	return t_max
end

local function rttbQuadraticSampling(robot, ball, targetPos, endSpeedLength, t_max, t_stop, t_out)
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
		if t_stop < t_out then
			return nil, robot_times[N_SAMPLES]
		else
			return nil, math.huge
		end
	end
	return t_ball_bsearch_start, t_ball_bsearch_end
end

local function rttbBinarySearch(robot, ball, targetPos, endSpeedLength,
		t_ball_bsearch_start, t_ball_bsearch_end)
	assert(t_ball_bsearch_start >= 0)
	assert(t_ball_bsearch_end >= t_ball_bsearch_start)
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
	return t_ball
end


--- calculates the time the robot takes to reach the ball (in a controlled fashion)
-- @param robot Robot - the robot
-- @param ball Ball - a ball-like structure
-- @param targetPos - the position the robot will look at
-- @param endSpeedLength - the maximal velocity of the robot when reaching the destination
-- @param lastTime - last result of robotTimeToBall for the given parameters
-- @return number - the estimated time
function Physics.robotTimeToBall(robot, ball, targetPos, endSpeedLength, lastTime)
	--local time0 = amun.getCurrentTime()
	-- if the ball is extremely slow, consider it as stationary
	if ball.speed:length() < 0.01 then
		local endSpeed = (ball.pos - robot.pos):setLength(endSpeedLength)
		local result = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, 0)
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("robotTimeToBall", time1 - time0)
		return result
	end

	-- calculate the time the ball needs to cross the field border
	local t_out = Physics.ballOutTime(ball)
	-- calculate the time until the ball stops
	local t_stop = Physics.ballStopTime(ball)
	-- upper bound for sampling and binary search
	local t_max = math.min(t_out, t_stop)

	local t_max, specialCaseResult = rttbSpecialCases(robot, ball, targetPos, endSpeedLength, t_max, t_out)
	if specialCaseResult then
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("robotTimeToBall", time1 - time0)
		return specialCaseResult
	end

	local t_ball_bsearch_start, t_ball_bsearch_end
	if lastTime and lastTime < math.huge and lastTime > 0 then
		-- try to reuse the sample from last frame
		local t_ball1 = math.max(0, lastTime-World.TimeDiff-0.035)
		local t_diff1 = t_ball1 - Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball1)
		local t_ball2 = lastTime
		local t_diff2 = t_ball2 - Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball2)

		if t_diff1 <= 0 and t_diff2 >= 0 then
			t_ball_bsearch_start = t_ball1
			t_ball_bsearch_end = t_ball2
		elseif t_diff1 >= 0 then
			t_ball_bsearch_start = 0
			t_ball_bsearch_end = t_ball1
		end
	end

	if not t_ball_bsearch_start then
		t_ball_bsearch_start, t_ball_bsearch_end
				 = rttbQuadraticSampling(robot, ball, targetPos, endSpeedLength, t_max, t_stop, t_out)

		if not t_ball_bsearch_start then
			--local time1 = amun.getCurrentTime()
			--plot.aggregate("robotTimeToBall", time1 - time0)
			return t_ball_bsearch_end
		end
	end

	local t_ball = rttbBinarySearch(robot, ball, targetPos, endSpeedLength,
			t_ball_bsearch_start, t_ball_bsearch_end)
	--local time1 = amun.getCurrentTime()
	--plot.aggregate("robotTimeToBall", time1 - time0)
	return t_ball
end

--- calculates the time the robot takes to reach the ball (without caring about directions and stuff)
-- @param robot Robot - the robot
-- @param ball Ball - a ball-like structure
-- @param howClose number - the intended distance between the centers of robot and ball; this defaults to robot.radius + ball.radius
-- @return number - the estimated time
-- @return Vector - the catch position
-- @return bool - was robot.maxSpeed exceeded?
local epsilon_t = 0.001
function Physics.getBallAsFastAsPossible(robot, ball, howClose)
	howClose = howClose or robot.radius + ball.radius
	if ball.pos:distanceTo(robot.pos) < howClose then
		-- we already have the ball, but still some idiot called this function
		return 0, robot.pos, true
	end
	--local t = 0
	local a_max = math.abs(robot.acceleration and robot.acceleration.aSpeedupFMax or 1.0)
	local ballStopTime = Physics.ballStopTime(ball)
	local ballPosAtCatchTime
	local t_catch = math.huge
	if ballStopTime < 10*epsilon_t then
		-- easy, such that no search over different times (of the ball position) must be done
		--log("ball is lying already")
		ballPosAtCatchTime = ball.pos
		local coefficients = {-0.25*a_max*a_max, 0, robot.speed:lengthSq() - a_max*howClose, 2*(robot.pos - ballPosAtCatchTime):dot(robot.speed), (robot.pos - ballPosAtCatchTime):lengthSq() - howClose*howClose}
		--log(coefficients[1].."x^4 + "..coefficients[2].."x^3 + "..coefficients[3].."x^2 + "..coefficients[4].."x + "..coefficients[5])
		local zeros = math.realRootsOfPolynomial(coefficients)
		-- 0 zeros is not possible because that would mean we have the ball for all times, also for t = 0 which was checked before
		-- furthermore the condition that we don't have the ball at t = 0 leads to at least 1 zero for t > 0 because we will definitely get the ball for large t
		for _, t in ipairs(zeros) do
			if t > 0 then
				if t < t_catch then
					t_catch = t
				end
			end
		end
		-- local a = -0.25*a_max*a_max
		-- local c = robot.speed:lengthSq() - a_max*howClose
		-- local d = 2*(robot.pos - ball.pos):dot(robot.speed)
		-- local e = (robot.pos - ball.pos):lengthSq() - howClose*howClose
		-- local discr4 = 256*a*a*a*e*e*e - 128*a*a*c*c*e*e + 144*a*a*c*d*d*e - 27*a*a*d*d*d*d + 16*a*c*c*c*c*e - 4*a*c*c*c*d*d
		-- if discr4 > 0 then
			-- -- 4 real solutions
			-- -- in this case at least the first solution must be at negative time
			-- -- so directly start searching for the two inner solutions
			-- -- if none of them is at positive time, search the fourth solution
			-- local t2 = math.sqrt(c/((-6)*a))	-- 12at²+2c=0	=> t=sqrt(-c/6a)
			-- local t1 = -t2						-- points of inflection as starting points for Newton search
			-- while math.abs(t2 - t1) > 2*epsilon_t do	-- if the two solutions are too close together, they are vulnerable to instabilities
				-- local t1New = t1 - (a*t1*t1*t1*t1 + c*t1*t1 + d*t1 + e)/(4*a*t1*t1*t1 + 2*c*t1 + d*t1)
				-- local finished = (math.abs(t1 - t1New) < epsilon_t)
				-- t1 = t1New
				-- local t2New = t2 - (a*t2*t2*t2*t2 + c*t2*t2 + d*t2 + e)/(4*a*t2*t2*t2 + 2*c*t2 + d*t2)
				-- finished = finished and (math.abs(t2 - t2New) < epsilon_t)
				-- t2 = t2New
				-- if finished then
					-- break
				-- end
			-- end
			-- if t1 > 0 then
				-- -- accept solution 1
				-- -- calculate position and whether robot.maxSpeed was exceeded
				-- local circleCenter = robot.pos + robot.speed*t1
				-- local accelDir = ball.pos - circleCenter
				-- local robotEndPos = ball.pos - accelDir:setLength(howClose)
				-- local robotEndSpeed = robot.speed + accelDir:setLength(a_max)*t1	-- end speed is max speed
				-- return t1, robotEndPos, (robotEndSpeed:lengthSq() > robot.maxSpeed*robot.maxSpeed)
			-- else
				-- if t2 > 0 then
					-- -- accept solution 2
					-- -- calculate position and whether robot.maxSpeed was exceeded
					-- local circleCenter = robot.pos + robot.speed*t2
					-- local accelDir = ball.pos - circleCenter
					-- local robotEndPos = ball.pos - accelDir:setLength(howClose)
					-- local robotEndSpeed = robot.speed + accelDir:setLength(a_max)*t2	-- end speed is max speed
					-- return t2, robotEndPos, (robotEndSpeed:lengthSq() > robot.maxSpeed*robot.maxSpeed)
				-- else
					-- -- search for outer solution
					-- local lowerBound = t2 + epsilon_t
					-- local f_low = a*lowerBound*lowerBound*lowerBound*lowerBound + c*lowerBound*lowerBound + d*lowerBound + e
					-- local upperBound = lowerBound + 1
					-- local f_upp = a*upperBound*upperBound*upperBound*upperBound + c*upperBound*upperBound + d*upperBound + e
					-- -- search for suiting interval that includes the solution
					-- while math.sign(f_low) == math.sign(f_upp) do
						-- lowerBound = upperBound
						-- f_low = f_upp
						-- upperBound = upperBound + 1
						-- f_upp = a*upperBound*upperBound*upperBound*upperBound + c*upperBound*upperBound + d*upperBound + e
					-- end
					-- -- find solution via bisection
					-- while upperBound - lowerBound > epsilon_t do
						-- local newBound = lowerBound + f_low*(upperBound - lowerBound)/(f_low + f_upp)
						-- local f_new = a*newBound*newBound*newBound*newBound + c*newBound*newBound + d*newBound + e
						-- if math.sign(f_new) == math.sign(f_low) then
							-- lowerBound = newBound
							-- f_low = f_new
						-- else
							-- upperBound = newBound
							-- f_upp = f_new
						-- end
					-- end
					-- -- calculate position and whether robot.maxSpeed was exceeded
					-- local circleCenter = robot.pos + robot.speed*upperBound
					-- local accelDir = ball.pos - circleCenter
					-- local robotEndPos = ball.pos - accelDir:setLength(howClose)
					-- local robotEndSpeed = robot.speed + accelDir:setLength(a_max)*upperBound	-- end speed is max speed
					-- return upperBound, robotEndPos, (robotEndSpeed:lengthSq() > robot.maxSpeed*robot.maxSpeed)
				-- end
			-- end
		--else
			-- 2 real solutions (the case of 0 solutions cannot occur here) where exactly 1 of them is at positive time
		--end
	-- end
	-- local ballStopPos = Physics.ballAtTime(ball, ballStopTime).pos
	-- local tr_ball = ballStopPos - ball.pos
	-- local a = tr_ball:lengthSq()
	-- local dist0 = ball.pos - robot.pos
	-- local b0 = 2*tr_ball:dot(dist0)
	-- local c0 = dist0:lengthSq() - R*R
	-- local lambda01, lambda02 = math.solveSq(a, b0, c0)
	-- if lambda01 then
		-- if lambda01 <= 1 and lambda01 > 0 then
			-- if lambda02 <= 1 and lambda02 > 0 then
				-- -- case 2
			-- else
				-- -- case 3
			-- end
		-- else
			-- if lambda02 <= 1 and lambda02 > 0 then
				-- -- case 3
			-- else
				-- -- only possible in case 1
			-- end
		-- end
	-- else
		-- -- case 4
	-- end
	-- while todo do -- FIXME
		-- local R = 0.5*a_max*t*t + robot.radius
		-- local otherStuff = tr_ball*t - dist0
		-- --solve |ball.pos(lambda) - (x_0 + v_0*t)|² = (1/2*a_max*t² + robot.radius)² for lambda
		-- local b = -2*tr_ball:dot(otherStuff)
		-- local c = otherStuff:lengthSq() - R*R
		-- local lambda1, lambda2 = math.solveSq(a, b, c)
		-- if lambda1 then
			-- local ballRollTime
			-- if lambda1 >= 0 and lambda1 <= 1 then
				-- local dist = lambda1*math.sqrt(a)
				-- ballRollTime = Physics.ballRollTime(ball, dist)
			-- end
			-- if lambda2 then

			-- else

			-- end
		-- else

		-- end
	-- end
	else
		-- check if we can catch the ball while rolling
		-- local ballStopPosition = Physics.ballAtTime(ball, ballStopTime)
		-- local ballTranslationVector = ball.pos - ballStopPosition
		-- -- calculate the points where the robot circle touches the ball line
		-- -- therefore calculate all cuts of the robot circle with the ball line
		-- -- which is done by solving the following polynomial of 2nd degree for lambda:
		-- -- lambda²*|ballTranslationVector|² + 2*lambda*ballTranslationVector:dot(ball.pos - (robot.pos + robot.speed*t)) + |ball.pos - (robot.pos + robot.speed*t)|² - (howClose + a_max*t²/2)² = 0
		-- -- this gives 0 to 2 solutions; the "touching points" are the cases with exactly 1 solution -> discriminant = 0
		-- -- discriminant = 4*(ballTranslationVector:dot(ball.pos - (robot.pos + robot.speed*t)))² - 4*|ballTranslationVector|²*(|ball.pos - (robot.pos + robot.speed*t)|² - (howClose + a_max*t²/2)²)
		-- -- this is 0 for 0, 2 or 4 real t depending on its discriminant (=discriminant2plus/minus)
		-- local det = robot.speed.y*ballTranslationVector.x - robot.speed.x*ballTranslationVector.y
		-- local ballTravelDistance = ballTranslationVector:length()
		-- local g = math.abs(det)/ballTravelDistance
		-- local diff = ball.pos - robot.pos
		-- local det2 = diff.y*ballTranslationVector.x - diff.x*ballTranslationVector.y
		-- local detdet = math.sign(det)*det2
		-- local discriminant2plus = g*g - 2*a_max*(howClose + detdet)
		-- local discriminant2minus = g*g - 2*a_max*(howClose - detdet)
		-- local t_touch = {}
		-- if discriminant2plus > 0 then
			-- local sqrtDiscriminant2plus = math.sqrt(discriminant2plus)
			-- local temp = (-g + sqrtDiscriminant2plus)/a_max
			-- if temp > 0 then
				-- -- only regard positive times
				-- t_touch[1] = temp
			-- end
			-- temp = (-g - sqrtDiscriminant2plus)/a_max
			-- if temp > 0 then
				-- table.insert(t_touch, temp)
			-- end
		-- end
		-- if discriminant2minus > 0 then
			-- local sqrtDiscriminant2minus = math.sqrt(discriminant2minus)
			-- local temp = (g + sqrtDiscriminant2minus)/a_max
			-- if temp > 0 then
				-- table.insert(t_touch, temp)
			-- end
			-- temp = (g - sqrtDiscriminant2minus)/a_max
			-- if temp > 0 then
				-- table.insert(t_touch, temp)
			-- end
		-- end
		-- if #t_touch == 0 then
			-- -- robot circle cuts (or touches) the ball line for all t
		
		-- else
			-- table.sort(t_touch)
			-- -- now we have up to 3 t_touch -> up to two intervals in which we can search for the first possible catch position
			-- -- but maybe some of them lie outside of the ball line segment -> calculate the corresponding lambdas
			-- local lambda = {}
			-- local slope = robot.speed:dot(ballTranslationVector)
			-- for i = 1, #t_touch do
				-- local a = ballTravelDistance*ballTravelDistance
				-- local centerDistance = diff - robot.speed*t_touch[i]
				-- local bHalf = ballTranslationVector:dot(centerDistance)
				-- lambda[i] = -bHalf/a
				-- -- if lambda lies outside [0,1] we have to find the point of time when the robot circle leaves the ball line segment
				-- -- here we can make use of the fact that the lambdas are monotically with respect to its index depending on sign(slope)
				-- -- i.e. if lamda[2] > 1 and lambda[1] < 1 then lambda[3] > 1
				-- -- TODO
			-- end
		-- end
		-- -- now we have 1 or 2 time intervals during which the robot circle cuts the ball line segment
		-- -- -> perform a search on these intervals to find the earliest moment when the ball touches the robot circle
		-- -- beginning with the earlier one of the intervals
		-- -- TODO: Zeitintervalle in earlyInterval und lateInterval aufteilen
		-- local found = false
		-- if earlyInterval then
			-- local t1, t2 = t_touch[1], t_touch[2]
			-- local dist1 = Physics.ballTravelledDistance(ball, t1)/ballTravelDistance - lambda[1]
			-- local dist2 = Physics.ballTravelledDistance(ball, t2)/ballTravelDistance - lambda[2]
			-- -- TODO lambdas anpassen, wenn t_touch modifiziert wurde (durch BallStrecke)
			-- local sign1 = math.sign(dist1)	-- if negative the ball is in front of the robot at t_touch[1]
			-- if sign1 ~= math.sign(dist2) then
			-- -- TODO: Das ist nicht die einzige Möglichkeit, wann es eine Lösung im earlyInterval geben kann
				-- -- in earlyInterval there is a solution
				-- while t2 - t1 > epsilon_t do
					-- local tNew = t2 - (t2 - t1)/(dist2 - dist1)*dist2
					-- local _, _, l1, l2 = geom.intersectLineCircle(ball.pos, ballTranslationVector, robot.pos + robot.speed*tNew, howClose + 0.5*a_max*tNew*tNew)
					-- local ballLambdaNew = Physics.ballTravelledDistance(ball, tNew)/ballTravelDistance
				-- end
				-- found = true
			-- end
		-- end
		-- if not found then
			-- -- search all times after t_touch[last]
			
		-- end
		local t_sw, v_sw, s_sw = Physics.ballSwitchParameters(ball)
		local found = false
		local vBall, vDiff, sDiff
		if t_sw > 0 then
			-- search for a solution in [0, t_sw]
			local a = 0.25*(Constants.fastBallDeceleration*Constants.fastBallDeceleration - a_max*a_max)
			vBall = ball.speed:length()
			vDiff = robot.speed - ball.speed
			sDiff = robot.pos - ball.pos
			local b = vDiff:dot(ball.speed)*Constants.fastBallDeceleration/vBall
			local c = vDiff:lengthSq() + ball.speed:dot(sDiff) - a_max*howClose
			local d = 2*sDiff:dot(vDiff)
			local e = sDiff:lengthSq() - howClose*howClose
			local coefficients = {a, b, c, d, e}
			local zeros = math.realRootsOfPolynomial(coefficients)
			for _, t in ipairs(zeros) do
				if t > 0 then
					if t < t_catch then
						t_catch = t
					end
				end
			end
			if t_catch < t_sw then
				found = true
			else
				t_catch = math.huge
			end
		end
		if not found then
			-- search for a solution in [t_sw, ballStopTime]
			local a = 0.25*(Constants.ballDeceleration*Constants.ballDeceleration - a_max*a_max)
			local vBallSwitch = ball.speed:copy():setLength(v_sw)
			vDiff = robot.speed - vBallSwitch
			local sBallSwitch = ball.pos + ball.speed:copy():setLength(s_sw)
			sDiff = robot.pos - sBallSwitch
			local b = vDiff:dot(vBallSwitch)*Constants.ballDeceleration/v_sw
			local c = vDiff:lengthSq() + vBallSwitch:dot(sDiff) - a_max*howClose
			local d = 2*sDiff:dot(vDiff)
			local e = sDiff:lengthSq() - howClose*howClose
			local coefficients = {a, b, c, d, e}
			local zeros = math.realRootsOfPolynomial(coefficients)
			local lowerBound = math.max(0, t_sw)
			for _, t in ipairs(zeros) do
				if t > lowerBound then
					if t < t_catch then
						t_catch = t
					end
				end
			end
			if t_catch < ballStopTime then
				found = true
			else
				t_catch = math.huge
			end
		end
		if not found then
			-- search for a solution in [ballStopTime, math.huge[
			local sRoll = v_sw*v_sw/(2*Constants.ballDeceleration)
			local ballStopPos = ball.pos + ball.speed:copy():setLength(s_sw + sRoll)
			sDiff = robot.pos - ballStopPos
			local coefficients = {-0.25*a_max*a_max, 0, robot.speed:lengthSq() - a_max*howClose, 2*sDiff:dot(robot.speed), sDiff:lengthSq() - howClose*howClose}
			local zeros = math.realRootsOfPolynomial(coefficients)
			for _, t in ipairs(zeros) do
				if t > ballStopTime then
					if t < t_catch then
						t_catch = t
					end
				end
			end
			-- there must be a solution now
			-- otherwise there is a mistake in the function
		end
	end
	local circleCenter = robot.pos + robot.speed*t_catch
	if not ballPosAtCatchTime then
		ballPosAtCatchTime = Physics.ballAtTime(ball, t_catch).pos
	end
	local accelDir = ballPosAtCatchTime - circleCenter
	local robotEndPos = ballPosAtCatchTime - accelDir:setLength(howClose)
	local robotEndSpeed = robot.speed + accelDir:setLength(a_max)*t_catch	-- end speed is max speed
	return t_catch, robotEndPos, (robotEndSpeed:lengthSq() < robot.maxSpeed*robot.maxSpeed)
end

return Physics
