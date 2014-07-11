local RobotTest = {}

local Robot = require "observer/robot"
local vis = require "../base/vis"
local debug = require "../base/debug"
local World = require "../base/world"

function RobotTest.testWayToRobotFree()
	assert(#World.FriendlyRobots > 1, "Need at least 2 friendly robots for this test")
	local robot1 = World.FriendlyRobots[1]
	local robot2 = World.FriendlyRobots[2]
	vis.addCircle("Target Position", robot2.pos, 0.02, vis.colors.red, true)
	-- fails here sometimes because robot to shoot can be near the ball and not be ballOwner
	if Robot.wayToRobotFree(robot2, robot1) then
		vis.addPolygon("test: Free Ball Corridor", {robot2.pos, World.Ball.pos}, vis.colors.blueHalf, true)
	end
end

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
