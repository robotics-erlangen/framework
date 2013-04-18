local RobotTest = {}

local Robot = require "observer/robot"
local vis = require "../base/vis"
local debug = require "../base/debug"
local World = require "../base/world"

function RobotTest.testMinTimeToBall()
	local robot = World.FriendlyRobots[1]
	if not robot then
		return
	end
	local ball = World.Ball
	
	debug.set("dist", robot.pos:distanceTo(ball.pos) - robot.radius - ball.radius)
	local time = Robot.minTimeToBall(robot, ball)
	debug.set("time", time)
end

return RobotTest
