local PhysicsTest = {}

local Physics = require "observer/physics"
local IO = require "util/io"


function PhysicsTest.testBallVsRobotTime()
	local ball = {
		pos = Vector(0.168249,-1.50264),
		speed = Vector(2.7468,1.88377),
		maxSpeed = 7,
		radius = 0.021
	}
	local robot = {
		pos = Vector(0.971402,-0.894273),
		speed = Vector(-0.791324,-0.469037),
		maxSpeed = 3, shootRadius = 0.08, dribblerWidth = 0.07,
		acceleration = { aSpeedupFMax = 3.3, aBrakeFMax = 3.5 }
	}
	local targetPos = Vector(0, 4.04)

	local s_max = 4
	local s_step = 0.01

	local mintime = Physics.robotTimeToBall(robot, ball, targetPos, robot.maxSpeed)
	local balldist = Physics.ballAtTime(ball, mintime).pos.y

	local values = {}
	for s = s_step,s_max,s_step do
		local endspeed = (ball.pos - robot.pos):setLength(0)
		local t_ball = Physics.ballRollTime(ball, s)
		local t_robot = Physics.robotTimeForBallTime(robot, ball, targetPos, robot.maxSpeed, t_ball)
		local t_diff = t_ball - t_robot

		local mttb_flag = "NaN"
		if s < balldist and s + s_step > balldist then
			mttb_flag = 0
		end
		table.insert(values, t_diff .. " " .. s .. " 0")
	end

	IO.save("physics.test", values)
end

function PhysicsTest.testBallStopTime()
	local ball = {pos = Vector(0, 0), speed = Vector(0, 2), maxSpeed = 8, radius = 0.021}

	local epsilon = 0.000001
	local x_stop = Physics.ballAtTime(ball, math.huge).pos
	local t_stop = Physics.ballRollTime(ball, ball.pos:distanceTo(x_stop) - epsilon)

	local t_stop2 = Physics.ballStopTime(ball)

	log(t_stop2 .. "     " .. t_stop)
end

return PhysicsTest