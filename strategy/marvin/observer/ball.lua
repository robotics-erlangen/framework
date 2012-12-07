local Ball = {} 

-- TODO: ball owner
-- TODO: who is the first at the ball

local World = require "../base/world"






local lastBallOwner

function Ball.ballOwner()
	if lastBallOwner then
		-- test if lastBallOwner still owns the ball
	else
		local minDistSq = 1000000 -- 1km
		for _,r in World.Robots do
			local distSq = (r.pos - World.Ball.pos).lengthSq()
			if distSq < minDist then
				minDist = 
		end
	end
end



return Ball