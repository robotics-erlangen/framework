local Base = require "play/base"
local Skuba = (require "../base/class").new("Play.Skuba", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Game = require "observer/game"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Field = require "util/field"

local MoveToPos = require "task/movetopos"
local DirectPass = require "task/directpass"
local Assistant = require "task/assistant"
local Volley = require "task/volley"
local PassInTheRun = require "task/passintherun"
local ShootGoal = require "task/shootgoal"

local G = World.Geometry

Skuba.weight = 1000
Skuba.timeout = 20
Skuba.maxRating = Base.rating.referee

Skuba._conditions = {}

function Skuba:_init()
	self._origBallPos = World.Ball.pos
	self._startTime = World.Time
end

function Skuba:_selectRobots(poolRobots)
	-- cacheable array manipulations
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	return RobotMatcher.match(self._messages, robots, math.bound(2, #robots, 4), Skuba._conditions)
end


function Skuba:switchDefault()
	if Ball.isShot(World.Ball) then
		log("Skuba -> Volley")
		self:_setState("Volley")
		self._virgin = false
	end
	if (World.Time - self._startTime) > 5 then
		if Robot.probableManMarker(self._robots[2]) ~= nil and self._robots[3] then
			log("Skuba -> PassToDistractors")
			self:_setState("PassToDistractors")	
		else
			log("Skuba -> Chip")
			self:_setState("Chip")
		end
	end
end

-- ================
-- ===== RATE =====
-- ================


local function rate(self, state) 
	local positiveState = {
		DirectOffensive = true,
		IndirectOffensive = true,
	}
	if positiveState[World.RefereeState] then
		if state ~= "Volley" then
			if (World.Geometry.FieldWidthHalf - math.abs(World.Ball.pos.x))^2
				+ (World.Geometry.FieldHeightHalf - World.Ball.pos.y)^2 < 1 then
				self._virgin = true
				return Base.rating.referee
			end	
		end
	elseif state == "Chip" or state == "PassToDistractors" then
		if Ball.isShot(World.Ball) then
			return Base.rating.no
		end
	elseif World.RefereeState == "Game" then
		if Field.isInField(World.Ball.pos) and self._virgin then
			return Base.rating.yes		
		end	
	else
		return Base.rating.no
	end
	if state == "Volley" then
		if World.Ball.pos:distanceTo(self._origBallPos) > 1 and Ball.isShot(World.Ball) then
			return Base.rating.no
		elseif Field.isInField(World.Ball.pos) and
				not (Ball.opponentBallOwner() and Ball.friendlyBallOwner()) then
			return Base.rating.yes		
		end
	end
	return Base.rating.no
end

function Skuba:rateDefault()
	return rate(self, "Default")
end

function Skuba:rateVolley()
	return rate(self, "Volley")
end

function Skuba:rateChip()
	return rate(self, "Chip")
end

function Skuba:ratePassToDistractors()
	return rate(self, "PassToDistractors")
end


-- ===================
-- ===== PREPARE =====
-- ===================


function Skuba:prepareDefault(chip)
	local linear = not chip
	local right = World.Ball.pos.x > 0
	local volleyAngle = (right and G.OpponentGoalRight or G.OpponentGoalLeft):angle()
	local volleyPos = Vector.create(0, 0)
	local distractor1 = Vector.create((right and -1 or 1) * 1, 1)	
	local distractor2 = Vector.create((right and -1 or 1) * 1.1, 2.7)	
	self._tasks = {
		self._robots[1] and DirectPass.create(self._robots[1], self._robots[2], linear, 3) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], volleyPos, volleyAngle) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], distractor1, (World.Ball.pos - distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], distractor2, (World.Ball.pos - distractor2):angle()) or nil,
	}
end


function Skuba:prepareVolley()
	local right = World.Ball.pos.x > 0
	local volleyAngle = (right and G.OpponentGoalRight or G.OpponentGoalLeft):angle()
	local volleyPos = Vector.create(0, 0)
	local distractor1 = Vector.create((right and -1 or 1) * 1, 1)	
	local distractor2 = Vector.create((right and -1 or 1) * 1.1, 2.7)	
	self._tasks = {
		self._robots[1] and Assistant.create(self._robots[1]) or nil,
		self._robots[2] and Volley.create(self._robots[2], self._origBallPos) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], distractor1, (World.Ball.pos - distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], distractor2, (World.Ball.pos - distractor2):angle()) or nil,
	}
end

function Skuba:prepareChip()
	self:prepareDefault(true)
end

function Skuba:preparePassToDistractors()
	local linear = not chip
	local right = World.Ball.pos.x > 0
	local volleyAngle = (right and G.OpponentGoalRight or G.OpponentGoalLeft):angle()
	local volleyPos = Vector.create(0, 0)
	local distractor1 = Vector.create((right and -1 or 1) * 1, 1)	
	local distractor2 = Vector.create((right and -1 or 1) * 1.1, 2.7)
	local passPos = Vector.create((right and -1 or 1) * 1, 1.8)
	self._tasks = {
		self._robots[1] and PassInTheRun.create(self._robots[1], self._robots[2], 
				passPos, self._robots[2].constants.passSpeed) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], volleyPos, volleyAngle) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], passPos, volleyAngle) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], distractor2, (World.Ball.pos - distractor2):angle()) or nil,
	}
end

return Skuba
