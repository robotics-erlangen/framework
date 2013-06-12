local Duel = (require "../base/class").new("Task.Duel", require "task/directpass")

local World = require "../base/world"
local Ball = require "observer/ball"
local Rating = require "util/rating"
local Learning = require "util/learning"
local Debug = require "../base/debug"
local Field = require "util/field"
local Constants = require "../base/constants"
local Direct = require "trajectory/direct"
local geom = require "../base/geom"

Duel.priority = 4



-- ======================
-- ===== misc stuff =====
-- ======================

function Duel:_init()
end

function Duel:_successProbability()
	return 1
end

function Duel:_rate()
	return Rating.posToRating(self._robot, World.Ball.pos)
end

function Duel:_reset()
	self.strategy = 0
	self.backwardsStartPoint = nil
	self.assistantPos = nil
	self.assistantDir = 0
	self.chipPos = nil
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



-- ===========================
-- ===== decision making =====
-- ===========================

-- an array containing all information for the roulette wheel selection algorithm in util/learning
local successRates = Learning.init(2)

-- decides what to do
-- [B] contest
-- [C] pass away
function Duel:_run(priorityMessages, notifications)
	self.oldOpposer = self.opposer
	self.opposer = Ball.opponentBallOwner()
	self.chipPos = (World.Geometry.OpponentGoal - World.Ball.pos):setLength(1) --1m towards opponent goal
	
	if self.opposer == nil then
		-- if no opponent robot is a ball owner
		if Settings.DEBUG then
			Debug.set("Decision", "pass away")
		end
		self:_passAway(notifications)
		self:_evaluateStrategy(true)
	elseif not self._robot:hasBall(World.Ball) then
		-- if we don't have the ball yet
		local viewPos = self:_calculateViewPos(World.Ball.pos)
		if Settings.DEBUG then
			Debug.set("Decision", "catch ball")
		end
		self:_catchBall(viewPos, 0.2)
	else
		-- if we have the ball, but at least one opponent is nearby
		self:_contest()
	end
	if Settings.DEBUG then
		Debug.set("Duel Dribbler", successRates[1].percentage)
		Debug.set("Duel Rotate", successRates[2].percentage)
	end
	return {
		defendedOpponent = self.opposer or self.oldOpposer,
		duelAssistantPos = self.assistantPos,
		duelAssistantDir = self.assistantDir,
		passTarget = self.duelAssistantTarget
	}
end

-- [B] contest
-- decides the duel strategy
-- (1) dribble and chip
-- (2) rotate
-- (3) ???
function Duel:_contest()
	if not self.strategy or self.strategy == 0 then
		self.strategy = Learning.decide(successRates)
	end
	if self.strategy == 1 then
		if Settings.DEBUG then
			Debug.set("Decision", "contest dribble")
		end
		self:_contestDribble()
	elseif self.strategy == 2 then
		if Settings.DEBUG then
			Debug.set("Decision", "contest rotate")
		end
		self:_contestRotate()
	elseif self.strategy == 3 then
		-- ???	
	else
		error("duel strategy "..self.strategy.." not implemented")
	end
end

-- tells the learning algorithm if the choice was successful
function Duel:_evaluateStrategy(pwned)
	if self.strategy and self.strategy ~= 0 then
		Learning.report(successRates, self.strategy, pwned)	
	end
	self:_reset()
end



-- ====================
-- ===== behavior =====
-- ====================


function Duel:_calculateViewPos(targetPos)
	local k = math.bound(0, targetPos.y / World.Geometry.FieldHeightHalf, 1)
	local toOpponentGoal = World.Geometry.OpponentGoal - targetPos
	local fromFriendlyGoal = targetPos - World.Geometry.FriendlyGoal
	local viewVector = toOpponentGoal:setLength(k) + fromFriendlyGoal:setLength(1-k)
	local viewPos = targetPos + viewVector
	return viewPos
end

-- [B] (1) dribble and chip
-- move backwards to gain some distance and chip over the opponent robot
function Duel:_contestDribble()
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

-- [B] (2) rotate
-- spin around to kick the ball to the side where another robot can catch it
function Duel:_contestRotate()
	--decide if we should rotate cw or ccw
	local toOpponentDir = (self.opposer and self.opposer.pos or World.Ball.pos) - self._robot.pos
	local intersection = geom.intersectLineLine(
			self._robot.pos, toOpponentDir, World.Geometry.OpponentGoal, Vector.create(1, 0))
	local ccw = intersection and math.sign(intersection.x) or 1 --positive = ccw, negative = cw
	local toBall = (World.Ball.pos - self._robot.pos):setLength(0.2)
	self._robot.trajectory:update(Direct, toBall, nil, ccw * 2 * 2*math.pi) -- 2 turns per second
end

-- [C] pass away
-- passAway is called if we won the duel, ergo no opponent robot is near the ball
-- 	while self._robot has the ball still in his dribbler
-- depending on what duel strategy we chose, we have more or less time to shoot the ball away
-- (1) dribble and chip:
--	chip the ball immediately over the opponent robot (ca 1m)
-- (?) otherwise: either the opponent robot is just to bad and moves away or something strange happened
--		(for example: we spin around like crazy and still got the ball)
--	pass to the best assistant (analyze notifications)
function Duel:_passAway(notifications)
	-- (?) otherwise
	if not self.strategy or self.strategy ~= 1 then
		-- 1. search best assistant
		local targetAssistant
		local bestRating = -1
		for robot, msg in pairs(notifications) do
			local currentRating = msg.task.assistantRating
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
			return
		end
	end
	-- (1) dribble and chip
	self:_shoot(self.chipPos, math.huge, false, 0)
end

return Duel
