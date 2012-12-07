local Ball = {} 

-- TODO: ball owner
-- TODO: who is the first at the ball

local World = require "../base/world"
local Settings = require "settings"


local lastBallOwner

-- returns the ballie
function Ball.ballOwner()
	-- tests if the current ball owner still got the ball
	if lastBallOwner then
		local distSq = (lastBallOwner.pos - World.Ball.pos):lengthSq()
		if distSq > (Settings.ballOwnDistance + Settings.ballOwnHysterese)^2 then
			lastBallOwner = nil
		end
	end
	-- searches for a new ball owner
	if not lastBallOwner then
		local minDistSq = math.huge
		for _,r in World.Robots do
			local distSq = (r.pos - World.Ball.pos):lengthSq()
			if distSq < minDistSq and distSq <= Settings.ballOwnDistance^2 then
				minDistSq = distSq
				lastBallOwner = r
			end
		end
	end
	return lastBallOwner
end



return Ball