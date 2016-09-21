local RobotTest = {}

local vis = require "../base/vis"
local World = require "../base/world"
local Robot = require "observer/robot"


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

return RobotTest
