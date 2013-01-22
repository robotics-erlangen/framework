local BallTest = {}

local Ball = require "observer/ball"
local vis = require "../base/vis"

function BallTest.testBallOwner()
	local owner = Ball.ballOwner()
	if owner then
		vis.addCircle("Ball Owner", owner.pos, 0.2, vis.colors.pinkHalf, true)
	end

end




return BallTest
