local PhysicsTest = {}

local Physics = require "observer/physics"
local IO = require "util/io"

function PhysicsTest.testBallVsRobotTime()
	local ball = {pos = Vector(0, 0), speed = Vector(0, 2), maxSpeed = 4}
	local robot = {pos = Vector(1, 0), speed = Vector(0, 0), maxSpeed = 3}
	local s_max = 4
	local s_step = 0.01

	local values = {}
	for s = s_step,s_max,s_step do
		local endspeed = (ball.pos - robot.pos):setLength(3)
		local t_ball = Physics.ballRollTime(ball, s)
		local t_robot = Physics.robotTimeToPos(robot, Vector(0, s), endspeed)
		local t_diff = t_ball - t_robot
		table.insert(values, t_diff)
	end

	IO.save("physicstest", values)
	log("done")
end

return PhysicsTest