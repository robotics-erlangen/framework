local Duel = (require "../base/class").new("Task.Duel", require "task/shoot")

local World = require "../base/world"
local Ball = require "observer/ball"
local Rating = require "util/rating"
local Learning = require "util/learning"
local Debug = require "../base/debug"
local Field = require "util/field"
local Constants = require "../base/constants"
local Direct = require "trajectory/direct"
local Rotate = require "trajectory/rotate"
local geom = require "../base/geom"

Duel.priority = 4


function Duel:_init()
end

function Duel:_successProbability()
	return 1
end

function Duel:_passAway(notifications)
	if self.strategy and self.strategy >= 1 then -- hurry!
		self:_shoot(self.chipPos, --where to chip
			math.huge, --that argument is ignored
			false, --chip
			0) --dont care about anything, just shoot. NOW!
	else -- pass to an assistant and communicate via message passing
		-- 1. search best assistant
		local targetAssistant
		local bestRating = -1
		for robot, msg in pairs(notifications) do
			local currentRating = msg.assistantRating
			if currentRating and currentRating > bestRating then
				targetAssistant = robot
				bestRating = currentRating
			end
		end
		if targetAssistant then
			-- 2. send message to assistant
			self.duelAssistantTarget = targetAssistant
			-- 3. pass to it
			-- FIXME play pass(inheritance), don't just shoot
			self:_shoot(targetAssistant.pos, math.huge, true, 0.8)
		end
	end
end

function Duel:_contestDribble()
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
			return
		end
		-- if moved to far then fail (20cm should be enough)
		if movedDist > 0.2 then
			self:_evaluateStrategy(false)
			return
		end
		-- else move backwards
		local toBallDir = World.Ball.pos - self._robot.pos
		local backwards = toBallDir:copy():scaleLength(-Settings.dribbleDriveSpeed)
		self._robot.trajectory:update(Direct, backwards, toBallDir:angle())
		-- calculate message to assistant
		-- TODO FIXME implement (observer) function that evaluates where to chip
		self.assistantPos = self.chipPos + (self.chipPos - World.Ball.pos)
			:setLength(self._robot.radius + Settings.receiveChipDistance)
		self.assistantDir = (World.Ball.pos - self.chipPos):angle()

	end
end

function Duel:_contestRotate()
	--decide if we should rotate cw or ccw
	local toOpponentDir = (self.opposer and self.opposer.pos or World.Ball.pos) - self._robot.pos
	local intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.OpponentGoal, Vector.create(1, 0))
	local ccw = intersection and math.sign(intersection.x) or 1 --positive = ccw, negative = cw
	self._robot.trajectory:update(Rotate, ccw * 2 * 2*math.pi) -- 2 turns per second
end

local successRates = Learning.init(2)
function Duel:_contest()
	--choose duel strategy (learning):
	if not self.strategy or self.strategy == 0 then
		self.strategy = Learning.decide(successRates)
		if Settings.DEBUG then
			log("duel strategy "..self.strategy)
		end
	end
	if self.strategy == 1 then --dribble backwards and chip over the opponent
		self:_contestDribble()
	elseif self.strategy == 2 then
		self:_contestRotate()
	elseif self.strategy == 3 then
	--   c) push!?	
	else
		error("duel strategy "..self.strategy.." not implemented")
	end

	-- 2. calculate good assistant positions
	-- 3. tell at least one assistant to go there
end

function Duel:_reset()
	self.strategy = 0
	self.backwardsStartPoint = nil
	self.assistantPos = nil
	self.assistantDir = 0
	self.chipPos = nil
end

function Duel:_evaluateStrategy(pwned)
	if self.strategy and self.strategy ~= 0 then
		Learning.report(successRates, self.strategy, pwned)	
	end
	self:_reset()
end


function Duel:_run(priorityMessages, notifications)
	self.opposer = Ball.opponentBallOwner()
	self.chipPos = (World.Geometry.OpponentGoal - World.Ball.pos):setLength(1) --1m towards opponent goal
	
	if not self._robot:hasBall(World.Ball) then
		-- if we dont have the ball yet
		self:_catchBall(World.Geometry.OpponentGoal, 0)
		self:_evaluateStrategy(false)
	elseif self.opposer == nil then
		-- if no opponent robot is a ball owner
		self:_passAway(notifications)
		self:_evaluateStrategy(true)
	else
		-- if we have the ball, but at least one opponent is nearby
		self:_contest()
	end
	if Settings.DEBUG then
		Debug.set("Duel Dribbler", successRates[1].percentage)
		Debug.set("Duel Rotate", successRates[2].percentage)
	end
	return {
		defendedOpponent = self.opposer,
		duelAssistantPos = self.assistantPos,
		duelAssistantDir = self.assistantDir,
		duelAssistantTarget = self.duelAssistantTarget
	}
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
