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

return BallTest
