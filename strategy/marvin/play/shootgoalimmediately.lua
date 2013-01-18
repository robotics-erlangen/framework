local Base = require "play/base"
local ShootGoalImmediately = (require "../base/class").new("Play.ShootGoalImmediately", Base)

local World = local World = require "../base/world"
local Observer = {}
Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"

ShootGoalImmediately.timeout = 5

function ShootGoalImmediately:_init()
end

function ShootGoalImmediately.startRating(attackers, defenders, minRating)
	if #attackers == 0 or minRating >= Base.rating.referee then
		return Base.rating.no
	end
	local ballOwner = Observer.Ball.ballOwner()
	if ballOwner and ballOwner.isFriendly then
		local ball = World.Ball
		if ballOwner:hasBall(ball) then
			--[[	könnte man noch für ShootGoal gebrauchen
			local robots = {}
			for _,r in ipairs(World.Robots) do
				if r.pos.y > ball.pos.y then
					table.insert(robots, r)
				end
			end
			local freeSectors = Observer.Goal.freeSectors(ball.pos, robots, true)
			for _,fs in ipairs(freeSectors) do
				if fs[1] < ballOwner.dir and fs[2] > ballOwner.dir then
					
				end
			end
			]]--
			local pointOnGoalLine = geom.intersectLineLine(ballOwner.pos, ballOwner.dir, World.Geometry.OpponentGoal, 0)
			local goalProbability = Observer.Shoot.evaluateShootCorridor(pointOnGoalLine, ballOwner.maxShotLinear, ball.pos, 0)
			if goalProbability > 0.92836 then -- warning! magic constant
				return Base.rating.force
			elseif goalProbability > 0.79731 then -- warning! magic constant
				return Base.rating.yes
			end
		else
			return Base.rating.no
		end
	else
		return Base.rating.no
	end
end

return ShootGoalImmediately