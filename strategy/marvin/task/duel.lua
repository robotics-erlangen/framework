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

local inst
function Duel.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		inst = inst or Duel.create(robot)
		return inst
	else
		inst = nil
	end
end

return Duel
