local Physics = {}

local Constants = require "../base/constants"


--- Calculates the ball position and speed at a given time point in the future
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
	local t_switch = 0
	local s_switch = 0

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
		if time < t_switch then
			local v_result = a_slide * time + v_current
			local s_result = a_slide / 2 * time * time + v_current * time
			result.speed = ball.speed:copy():setLength(v_result)
			result.pos = ball.pos + ball.speed:copy():setLength(s_result)
			return result
		end
	else
		v_switch = v_current
	end

	-- t_stop: how long the ball stays in the rolling stage
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
	local t_switch = 0
	local s_switch = 0

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
			return t_result;
		end
	else
		v_switch = v_current
	end

	local s_roll = distance - s_switch
	-- a_roll/2 * t^2 + v_switch * t - s_roll = 0
	local t_roll = math.solveSq(a_roll / 2, v_switch, -s_roll + epsilon) or math.huge;
	local t_result = t_switch + t_roll
	return t_result
end


return Physics