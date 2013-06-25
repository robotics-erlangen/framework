local Base = require "play/base"
local Skuba = (require "../base/class").new("Play.Skuba", Base)

local World = require "../base/world"
local RobotList = require "util/robotlist"
local RobotMatcher = require "control/robotmatcher"
local Game = require "observer/game"
local Ball = require "observer/ball"
local Field = require "util/field"

local MoveToPos = require "task/movetopos"
local DirectPass = require "task/directpass"
local Assistant = require "task/assistant"
local Volley = require "task/volley"

local G = World.Geometry

Skuba.weight = 1000
Skuba.timeout = 20
Skuba.maxRating = Base.rating.referee

Skuba._conditions = {}

function Skuba:_init()
	self._origBallPos = World.Ball.pos
end

function Skuba:_selectRobots(poolRobots)
	-- cacheable array manipulations
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	return RobotMatcher.match(self._messages, robots, math.bound(2, #robots, 4), Skuba._conditions)
end

function Skuba:rateDefault(isInit)
	local positiveState = {
		DirectOffensive = true,
		IndirectOffensive = true,
	}
	if positiveState[World.RefereeState] then
		if (World.Geometry.FieldWidthHalf - math.abs(World.Ball.pos.x))^2
			+ (World.Geometry.FieldHeightHalf - World.Ball.pos.y)^2 < 1 then
			return Base.rating.referee
		end
	elseif World.RefereeState == "Game" then
		if Field.isInField(World.Ball.pos) then
			return Base.rating.yes		
		end
	end
	return Base.rating.no
end

function Skuba:prepareDefault()
	-- 
	local right = World.Ball.pos.x > 0
	local volleyAngle = (right and G.OpponentGoalRight or G.OpponentGoalLeft):angle()
	local volleyPos = Vector.create(0, 0)
	local distractor1 = Vector.create((right and -1 or 1) * 1, 2.5)	
	local distractor2 = Vector.create((right and -1 or 1) * 1.1, 2.7)	
	self._tasks = {
		self._robots[1] and DirectPass.create(self._robots[1], self._robots[2], true, 3) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], volleyPos, volleyAngle) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], distractor1, (World.Ball.pos - distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], distractor2, (World.Ball.pos - distractor2):angle()) or nil,
	}
end

function Skuba:switchDefault()
	if Ball.isShot(World.Ball) then
		log("change to volley")
		self:_setState("Volley")
	end
end

function Skuba:rateVolley()
	local positiveState = {
		DirectOffensive = true,
		IndirectOffensive = true,
		Game = true,
	}
	if positiveState[World.RefereeState] then
		if Field.isInField(World.Ball.pos) then
			return Base.rating.yes		
		end
	end
	return Base.rating.no
end

function Skuba:prepareVolley()
	local right = World.Ball.pos.x > 0
	local volleyAngle = (right and G.OpponentGoalRight or G.OpponentGoalLeft):angle()
	local volleyPos = Vector.create(0, 0)
	local distractor1 = Vector.create((right and -1 or 1) * 1, 2.5)	
	local distractor2 = Vector.create((right and -1 or 1) * 1.1, 2.7)	
	self._tasks = {
		self._robots[1] and Assistant.create(self._robots[1]) or nil,
		self._robots[2] and Volley.create(self._robots[2], self._origBallPos) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], distractor1, (World.Ball.pos - distractor1):angle()) or nil, 
		self._robots[4] and MoveToPos.create(self._robots[4], distractor2, (World.Ball.pos - distractor2):angle()) or nil,
	}
end

return Skuba
