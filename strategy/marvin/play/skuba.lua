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
local MoveToStaticBall = require "task/movetostaticball"
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


-- =================
-- ===== STUFF =====
-- =================

function Skuba:_init()
	self._origBallPos = World.Ball.pos
	self._startTime = World.Time
end

function Skuba:_selectRobots(poolRobots)
	-- cacheable array manipulations
--	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	local robots = poolRobots.attack
	return RobotMatcher.match(self._messages, robots, math.bound(2, #robots, 4), Skuba._conditions)
end

function Skuba:switchDefault()
	if Ball.friendlyBallOwner() == self._robots[1] then
		log("Prepare -> PassToMid")
		self:_setState("PassToMid")
	end
end

function Skuba:switchPassToMid()
	if Ball.isShot(World.Ball) then
		log("PassToMid -> Volley")
		self:_setState("Volley")
		self._virgin = false
		self._volleyStartTime = World.Time
	end
	if (World.Time - self._startTime) > 7 then
		if Robot.probableManMarker(self._robots[2]) ~= nil and self._robots[3] then
			log("PassToMid -> PassToDistractors")
			self:_setState("PassToDistractors")	
		else
			log("PassToMid -> Chip")
			self:_setState("Chip")
		end
	end
end

function Skuba:_update(chip)
	self._linear = not chip
	self._right = World.Ball.pos.x > 0
	self._volleyAngle = (self._right and G.OpponentGoalRight or G.OpponentGoalLeft):angle()
	self._volleyPos = Vector.create((self._right and -1 or 1) * 0.2, World.Geometry.FieldHeightHalf/6)
	self._distractor1 = Vector.create((self._right and -1 or 1) * World.Geometry.FieldWidthHalf/2, World.Geometry.FieldHeightHalf/3)	
	self._distractor2 = Vector.create((self._right and -1 or 1) * World.Geometry.FieldWidthHalf/2+0.2, World.Geometry.FieldHeightHalf/3*2)	
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
--[
			if (World.Geometry.FieldWidthHalf - math.abs(World.Ball.pos.x))^2
				+ (World.Geometry.FieldHeightHalf - World.Ball.pos.y)^2 < 1 then
--]]		if (World.Ball.pos.y > 0) then
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
		local time = World.Time - self._volleyStartTime
		if time > 1 and Ball.isShot(World.Ball) or time > 5 then
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

function Skuba:ratePassToMid()
	return rate(self, "PassToMid")
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


-- ==================
-- ===== ACTION =====
-- ==================


function Skuba:prepareDefault()
	self:_update()
	self._tasks = {
		self._robots[1] and MoveToStaticBall.create(self._robots[1], World.Geometry.OpponentGoal) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], self._volleyPos, self._volleyAngle) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], self._distractor1, (World.Ball.pos - self._distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], self._distractor2, (World.Ball.pos - self._distractor2):angle()) or nil,
	}
end

function Skuba:preparePassToMid(chip)
	self:_update(chip)
	self._tasks = {
		self._robots[1] and DirectPass.create(self._robots[1], self._robots[2], self._linear, 2) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], self._volleyPos, self._volleyAngle) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], self._distractor1, (World.Ball.pos - self._distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], self._distractor2, (World.Ball.pos - self._distractor2):angle()) or nil,
	}
end

function Skuba:prepareVolley()
	self:_update()
	self._tasks = {
		self._robots[1] and MoveToPos.create(self._robots[1], Vector.create(0, 0), math.pi/2) or nil, --- XXX
		-- Hack to prevent the robots[1] from blocking the volley shot
		-- originally, it was an assistant
		self._robots[2] and Volley.create(self._robots[2], self._origBallPos) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], self._distractor1, (World.Ball.pos - self._distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], self._distractor2, (World.Ball.pos - self._distractor2):angle()) or nil,
	}
end

function Skuba:prepareChip()
	self:preparePassToMid(true)
end

function Skuba:preparePassToDistractors()
	self:_update()
	local passPos = Vector.create((self._right and -1 or 1) * 1, 1.8)
	self._tasks = {
		self._robots[1] and PassInTheRun.create(self._robots[1], self._robots[2], 
				passPos) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], self._volleyPos, self._volleyAngle) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], passPos, self._volleyAngle) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], self._distractor2, (World.Ball.pos - self._distractor2):angle()) or nil,
	}
end

return Skuba
