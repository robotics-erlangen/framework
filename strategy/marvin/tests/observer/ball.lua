local BallTest = {}

local Ball = require "observer/ball"
local World = require "../base/world"
local vis = require "../base/vis"


function BallTest.testWayToRobotFree()
	assert(#World.FriendlyRobots > 1, "Need at least 2 friendly robots for this test")
	local robot1 = World.FriendlyRobots[1]
	local robot2 = World.FriendlyRobots[2]
	vis.addCircle("Target Position", robot2.pos, 0.02, vis.colors.red, true)
	-- fails here sometimes because robot to shoot can be near the ball and not be ballOwner
	if Ball.wayToRobotFree(robot2, robot1) then
		vis.addPolygon("Free Ball Corridor", {robot2.pos, World.Ball.pos}, vis.colors.blueHalf, true)
	end
end

function BallTest.testBallOwner()
	local fowner = Ball.friendlyBallOwner()
	if fowner then
		vis.addCircle("Ball Owner", fowner.pos, 0.2, vis.colors.skyBlueHalf, true)
	end

	local oowner = Ball.opponentBallOwner()
	if oowner then
		vis.addCircle("Ball Owner", oowner.pos, 0.2, vis.colors.blueHalf, true)
	end
end

function BallTest.testAtTime()
	local moments = {0.2, 0.5, 1}
	for _,t in pairs(moments) do
		vis.addCircle("Future Ball Pos", Ball.atTime(t).pos, World.Ball.radius, vis.colors.orangeHalf, true)
	end
end

local isShotCooldown = 0.3
local lastShootTime = 0
local lastShootRobotPos = nil

function BallTest.testIsShot()
	local time = World.Time
	local r = Ball.isShot()
	if r then
		lastShootTime = World.Time
		lastShootRobotPos = r.pos
	end
	if World.Time <= lastShootTime + isShotCooldown then
		vis.addCircle("Shoot Robot", lastShootRobotPos, 0.15, vis.colors.magentaHalf, true)
	end
end

return BallTest
