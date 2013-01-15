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
			--[[
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
			if Observer.Shoot.evaluateShootCorridor(ballOwner.pos, pointOnGoalLine) > magicConstant then
				---
			end
		else
			return Base.rating.no
		end
	else
		return Base.rating.no
	end
end

return ShootGoalImmediately