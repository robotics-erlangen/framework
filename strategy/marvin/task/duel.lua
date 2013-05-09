local Duel = (require "../base/class").new("Task.Duel", require "task/shoot")

local World = require "../base/world"
local Ball = require "observer/ball"
local Rating = require "util/rating"
local Learning = require "util/learning"
local Debug = require "../base/debug"
local Field = require "util/field"
local Constants = require "../base/constants"
local Direct = require "trajectory/direct"

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
		if Settings.DEBUG then
			log("duel strategy "..self.strategy)
		end
	end
	if self.strategy == 1 then --dribble backwards and chip over the opponent
		-- use dribbler
		self._robot:setDribblerSpeed(1)
		if not self.backwardsStartPoint then
			self.backwardsStartPoint = self._robot.pos
		else
			-- if moved to illegal positions (out of field, friendly defense area) then fail
			local movedDist = self.backwardsStartPoint:distanceTo(self._robot.pos)
			if not Field.isInField(self._robot.pos, 0)
					or Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
				self.strategy = 2
				self:_evaluateStrategy(false)
				return nil
			end
			-- if moved to far then fail (20cm should be enough)
			if movedDist > 0.2 then
				self:_evaluateStrategy(false)
				return nil
			end
			-- else move backwards
			local toBallDir = World.Ball.pos - self._robot.pos
			local backwards = toBallDir:copy():scaleLength(-Settings.dribbleDriveSpeed)
			self._robot.trajectory:update(Direct, backwards, toBallDir:angle())
		end
	elseif self.strategy == 2 then
	--   b) use dribbler and rotate/shoot instantly
	else
	--   c) ???
		error("duel strategy "..self.strategy.." not implemented")
	end

	-- 2. calculate good assistant positions
	-- 3. tell at least one assistant to go there
	
	return assistantPos
end

function Duel:_reset()
	self.strategy = 0
	self.backwardsStartPoint = nil
end

function Duel:_evaluateStrategy(pwned)
	if self.strategy and self.strategy ~= 0 then
		Learning.report(successRates, self.strategy, pwned)	
	end
	self:_reset()
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
