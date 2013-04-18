local Duel = (require "../base/class").new("Task.Duel", require "task/shoot")

local World = require "../base/world"
local Ball = require "observer/ball"
local Rating = require "util/rating"

Duel.priority = 4


function Duel:_init()
end

local function passAway()
	--TODO
	--log("pass away not implemented")
end

local function contest()
	--TODO
	--log("contest not implemented")
end


function Duel:_run()
	local opposer = Ball.opponentBallOwner()
	if not self._robot:hasBall(World.Ball) then
		-- if we dont have the ball yet
		self:_catchBall(World.Geometry.OpponentGoal, 0)
	elseif opposer == nil then
		-- if no opponent robot is a ball owner
		passAway()
	else
		-- if we have the ball, but at least one opponent is nearby
		contest()
	end
end

function Duel:_rate()
	return Rating.posToRating(self._robot, World.Ball.pos)
end

function Duel.factory(position)
	local f = function (robots)
		return Duel.create(robots[position])
	end
	return f
end

function Duel.test(id)
	if id > 0 then
		return nil
	end
	return Duel.factory(1), 1
end

return Duel
