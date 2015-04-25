local PhysicsTest = {}

local Physics = require "observer/physics"
local IO = require "util/io"

function PhysicsTest.testBallVsRobotTime()
	local ball = {pos = Vector(0, 0), speed = Vector(0, 2), maxSpeed = 8, radius = 0.021}
	local robot = {pos = Vector(0.3, 2.5), speed = Vector(0, 0), maxSpeed = 3, radius = 0.09}
	local s_max = 4
	local s_step = 0.01


	local mintime = Physics.robotMinTimeToBall(robot, ball)
	local balldist = Physics.ballAtTime(ball, mintime).pos.y

	local values = {}
	for s = s_step,s_max,s_step do
		local endspeed = (ball.pos - robot.pos):setLength(3)
		local t_ball = Physics.ballRollTime(ball, s)
		local t_robot = Physics.robotTimeToPos(robot, Vector(0, s), endspeed)
		local t_diff = t_ball - t_robot

		local mttb_flag = "NaN"
		if s < balldist and s + s_step > balldist then
			mttb_flag = 0
		end
		table.insert(values, t_diff .. " " .. mttb_flag)
	end

	IO.save("physicstest", values)

	local x_ball = Physics.ballAtTime(ball, mintime).pos
	log(mintime .. "s -- " .. x_ball.y .. "m")
end

return PhysicsTest