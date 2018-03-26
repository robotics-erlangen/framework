local KeeperTest = Class("Test.Move.KeeperTest", require "group/move/base")

local DebugCommands = require "../base/debugcommands"
local World = require "../base/world"
local Goal = require "observer/goal"
local Halt = require "task/shared/halt"
local Keeper = require "task/keeper/keeper"
local HallucinatingKeeper = require "task/test/hallucinatingkeeper"
local IO = require "util/io"
local G = World.Geometry

KeeperTest.MIN_ROBOTS = 1
KeeperTest.MAX_ROBOTS = 1

local SHOOT_SPEED = 6.5

local MIN_DISTANCE = 3.8
local MAX_DISTANCE = 3.8
local DISTANCE_INCREMENT = 0

local MIN_ANGLE = 1/4 * math.pi
local MAX_ANGLE = 3/4 * math.pi
local ANGLE_INCREMENT = 1/12 * math.pi

local RECORD = false
local FILENAME = "crescent"
local DESTINATION = "test/move/balldata/"..FILENAME..".balldata"

function KeeperTest.canStart()
	return true
end

function KeeperTest:_init()
	self._startTime = World.Time
	self._state = "Prepare"
	self._distance = MIN_DISTANCE
	self._angle = MIN_ANGLE
	self._shootLeft = false
	if RECORD then
		IO.save(DESTINATION, {})
	end
end

function KeeperTest:_canContinue()
	return true
end

function KeeperTest:_increment()
	self._shootLeft = not self._shootLeft

	if self._shootLeft == false then
		self._angle = self._angle + ANGLE_INCREMENT
		if self._angle > MAX_ANGLE then
			self._angle = MIN_ANGLE
		end

		self._distance = self._distance + DISTANCE_INCREMENT
		if self._distance > MAX_DISTANCE then
			self._distance = MIN_DISTANCE
		end

		local angle = self._angle / math.pi
		local message = "New Shot from distance "..tostring(self._distance).." and angle "..tostring(angle)
		log(message)
		if RECORD then
			IO.append(DESTINATION, message)
		end
	end
end

function KeeperTest:_update()
	local goal = G.FriendlyGoal
	local startPos = goal + Vector.fromAngle(self._angle):setLength(self._distance)

	-- append
	if RECORD then
		local speedVector = World.Ball.speed
		local spdX = speedVector.x
		local spdY = speedVector.y
		local relativePos = (World.Ball.pos - goal)
		local relX = relativePos.x
		local relY = relativePos.y

		local atkPos, atkDir, isShot = Goal.predictShot()
		IO.append(DESTINATION, tostring(relX).." "..tostring(relY).." "..tostring(spdX)
				.." "..tostring(spdY).." "..tostring(atkPos.x).." "..tostring(atkPos.y)
				.." "..tostring(atkDir.x).." "..tostring(atkDir.y).." "..tostring(isShot))
	end

	if self._state == "Prepare" and World.Time - self._startTime > 2 then
		self._state = "Shot"
		self._startTime = World.Time
		local targetPos = self._shootLeft and Vector(goal.x + 0.5, goal.y) or Vector(goal.x - 0.5, goal.y)
		local ball = {
			pos = startPos,
			posZ = 0,
			speedZ = 0,
			speed = (targetPos - startPos):setLength(SHOOT_SPEED) -- shoot with max speed
		}
		DebugCommands.moveObjects(ball)
		self:_increment()
	elseif self._state == "Shot" and World.Time - self._startTime > 3 then
		self._state = "Prepare"
		self._startTime = World.Time
		local ball = {
			pos = startPos,
			posZ = 0,
			speedZ = 0,
			speed = Vector(0, 0)
		}
		if World.IsSimulated then
			DebugCommands.moveObjects(ball)
		end
	end
end


function KeeperTest:_updateTasks()
	local taskAssignments = {}

	if World.IsSimulated then
		self:_update()
		taskAssignments[self._robots[1]] = {class = Keeper, params = {}, restart = false}
	elseif not RECORD then
		taskAssignments[self._robots[1]] = {class = HallucinatingKeeper, params = {DESTINATION}}
	else
		taskAssignments[self._robots[1]] = {class = Halt, params = {}}
	end

	return taskAssignments, self._robots[1]
end

return KeeperTest