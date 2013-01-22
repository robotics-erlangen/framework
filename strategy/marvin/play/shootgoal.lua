local Base = require "play/base"
local ShootGoal = (require "../base/class").new("Play.ShootGoal", Base)

local World = local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"

ShootGoal.timeout = 10
ShootGoal._conditions = {}

function ShootGoal:_init()
end

function ShootGoal.startRating(attackers, defenders, minRating)
	if #attackers == 0 or minRating >= Base.rating.force then
		return Base.rating.no
	end
	local ballOwner = Observer.Ball.ballOwner()
	if ballOwner and ballOwner.isFriendly then
		local ball = World.Ball
		if ballOwner:hasBall(ball) then -- or if we will be the first at the ball
			local robots = {}
			for _,r in ipairs(World.Robots) do
				if r.pos.y > ball.pos.y then
					table.insert(robots, r)
				end
			end
			local freeSectors = Observer.Goal.freeSectors(ball.pos, robots, true)
			local bestRating, bestSector = 0, 1
			for k, fs in ipairs(freeSectors) do -- TODO: gescheite Funktion implementieren, die die Zeit abschätzt, die der Roboter braucht, um sich mit dem Ball um einen bestimmten Winkel zu drehen
				local rating = (fs[2] - fs[1])*(10 - geom.getAngleDiff(ballOwner.dir, 0.5*(fs[1] + fs[2]))^2) -- wie gesagt, nur ganz grobe Abschätzung der Qualität eines Sektors
				if rating > bestRating then
					bestRating = rating
					--bestSector = k
				end
			end
			if bestRating > 1.50861 then -- OBACHT! never tested magic constant
				return Base.rating.yes
			elseif bestRating > 0.87350 then -- OBACHT! never tested magic constant
				return Base.rating.perhaps
			else
				return Base.rating.no
			end
		else
			return Base.rating.no
		end
	else
		return Base.rating.no
	end
end

return ShootGoal