local Duel = (require "../base/class").new("Task.Duel", require "task/shoot")

local World = require "../base/world"
local Ball = require "observer/ball"
local Rating = require "util/rating"
local Learning = require "util/learning"
local Debug = require "../base/debug"

Duel.priority = 4


function Duel:_init()
end

function Duel:_passAway()
	--TODO
	--log("pass away not implemented")

	-- 1. search for assistants

	-- 2. choose the best one
	-- 3. pass to it
end

local successRates = Learning.init(2)
function Duel:_contest()
	-- 1. choose duel strategy (learning):
	if not self.strategy or self.strategy == 0 then
		self.strategy = Learning.decide(successRates)
	end
	if self.strategy == 1 then
		log("duel strategy: dribbler")
	--   a)	use dribbler and move backwards
	--	success, if the ball is still in the dribbler after a short distance
	--	failure, if we loose the ball
	elseif self.strategy == 2 then
		log("duel strategy: rotate")
	--   b) use dribbler and rotate/shoot instantly
	--	success, if a friendly robot gets the ball
	--	failure, if an opponent gets the ball or the ball leaves the field
	else
	--   c) ???
		error("duel strategy "..self.strategy.." not implemented")
	end

	-- 2. calculate good assistant positions
	-- 3. tell at least one assistant to go there
	
	return assistantPos
end

function Duel:_evaluateStrategy(pwned)
	if self.strategy and self.strategy ~= 0 then
		Learning.report(successRates, self.strategy, pwned)	
		self.strategy = 0
	end
end


function Duel:_run()
	local opposer = Ball.opponentBallOwner()
	local assistantPos = nil
	if not self._robot:hasBall(World.Ball) then
		-- if we dont have the ball yet
		self:_catchBall(World.Geometry.OpponentGoal, 0)
		self:_evaluateStrategy(false)
	elseif opposer == nil then
		-- if no opponent robot is a ball owner
		self:_passAway()
		self:_evaluateStrategy(true)
	else
		-- if we have the ball, but at least one opponent is nearby
		assistantPos = self:_contest()
	end
	if Settings.DEBUG then
		Debug.set("Duel Dribbler", successRates[1].percentage)
		Debug.set("Duel Rotate", successRates[2].percentage)
	end
	return { defendedOpponent = opposer, duelAssistantPos = assistantPos }
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
