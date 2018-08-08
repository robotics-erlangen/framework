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

local MIN_ANGLE = 1/4 * math.pi
local MAX_ANGLE = 3/4 * math.pi
local ANGLE_INCREMENT = 1/12 * math.pi

local MIN_DISTANCE = 3.8
local MAX_DISTANCE = 3.8
local DISTANCE_INCREMENT = 0

local RECORD = false
local FILENAME = "crescent"
local DESTINATION = "test/move/balldata/"..FILENAME..".balldata"

local HALLUCINATE_SIMULATOR = false
local HALT = true


-- Instructions:

-- Using a preexisting balldata file:
-- move a .balldata file you want to use to the folder "marvin/test/move/balldata"
-- .balldata files can be found on the NAS or recorded manually (more on that later)
-- change the FILENAME constant to the name of the .balldata file
-- On an actual field the robot will proceed to chase the imaginary ball
-- If you want to have to robot hallucinate even in the simulator, set the HALLUCINATE_SIMULATOR flag to true

-- Recording a balldata file:
-- Specify a filename in the FILENAME constant and set the RECORD flag to true
-- NOTE: If the name already exists it will be overwritten
-- The move will record as long as the strategy is running and the RECORD flag is true,
-- the test will run on repeat indefinitely

-- Specifying test shots:
-- Shots will always alternate between the left and right side of the goal
-- After both sides of the goal have been hit, the angle, starting from MIN_ANGLE, will increment by ANGLE_INCREMENT
-- Should the new angle then exceed the MAX_ANGLE, it will be reset to MIN_ANGLE and the distance will be incremented
-- Distance will start at MIN_DISTANCE and increment by DISTANCE_INCREMENT
-- Should the new distance exceed the MAX_DISTANCE, it will be reset to MIN_DISTANCE
-- Shoot speed can be specified in the constant SHOOT_SPEED

-- Visualisations:
-- the visualisation "test/move/keepertest: Imaginary Ball" will display the ball from the .balldata file
-- the visualisation "test/move/keepertest: Hit" will put a red marker on the keeper if it has touched the ball
-- This is to evaluate how centrally the ball would have been caught
-- This marker will be reset every shot

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
	end

	local angle = self._angle / math.pi
	local message = "New Shot from distance "..tostring(self._distance).." and angle "..tostring(angle)
	log(message)
	if RECORD then
		IO.append(DESTINATION, message)
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

	if World.IsSimulated and not HALLUCINATE_SIMULATOR then
		self:_update()
		taskAssignments[self._robots[1]] = {class = HALT and Halt or Keeper, params = {}, restart = false}
	elseif not RECORD then
		taskAssignments[self._robots[1]] = {class = HallucinatingKeeper, params = {DESTINATION}}
	else
		taskAssignments[self._robots[1]] = {class = Halt, params = {}}
	end

	return taskAssignments, self._robots[1]
end

return KeeperTest