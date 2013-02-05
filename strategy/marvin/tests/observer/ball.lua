local BallTest = {}

local Ball = require "observer/ball"
local World = require "../base/world"
local vis = require "../base/vis"

function BallTest.testBallOwner()
	local owner = Ball.ballOwner()
	if owner then
		vis.addCircle("Ball Owner", owner.pos, 0.2, vis.colors.pinkHalf, true)
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
