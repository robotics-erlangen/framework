local ManMark = Class("Task.ManMark", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Defense = require "util/defense"
local Field = require "../base/field"
local Physics = require "observer/physics"


local BLOCK_DIST_MAX = 0.05
local BLOCK_DIST_HYSTERESIS = 0.02
local BLOCK_POS_ALPHA = 0.1
local BLOCK_POS_PRECISION = 0.01
local DEFENSE_AREA_MIN_DISTANCE = 0.04


function ManMark:_init(targetRobot)
	assert(targetRobot, "ManMark task needs a target robot")
	self._targetRobot = targetRobot
	self._oldPosition = nil
	self._blockingShot = false
end

-- this function searches for a position between boundaryOne and boundaryTwo to which the robot will take
-- the shortest amount of time, up to a precision value, using a ternary algorithm
function ManMark:_findBestPointToBlockOpponentShot(boundaryOne, boundaryTwo, precision)
	-- time to the boundaries
	local timeToBoundaryOne = Physics.robotTimeToPos(self._robot, boundaryOne, Vector(0, 0), false, false)
	local timeToBoundaryTwo = Physics.robotTimeToPos(self._robot, boundaryTwo, Vector(0, 0), false, false)

	-- time diff between the two bounds
	if math.abs(timeToBoundaryOne - timeToBoundaryTwo) < precision then
		return boundaryOne
	end

	-- calculate two new positions on the line
	local leftThird = (boundaryOne * 2 + boundaryTwo) / 3
	local rightThird = (boundaryOne + boundaryTwo * 2) / 3

	-- calculate time to the new positions
	local timeToLeftThird = Physics.robotTimeToPos(self._robot, leftThird, Vector(0, 0), false, false)
	local timeToRightThird = Physics.robotTimeToPos(self._robot, rightThird, Vector(0,0), false, false)

	-- depending on which time is smaller recursively call the function with new boundaries
	if timeToLeftThird < timeToRightThird then
		return self:_findBestPointToBlockOpponentShot(boundaryOne, rightThird, precision)
	else
		return self:_findBestPointToBlockOpponentShot(leftThird, boundaryTwo, precision)
	end
end

-- this method calculates a new position between boundaryOne and boundaryTwo regarding the oldPosition
function ManMark:_newPosRegardingOldPosition(boundaryOne, boundaryTwo, oldPos, precision)
	local newPos = self:_findBestPointToBlockOpponentShot(boundaryOne, boundaryTwo, precision)
	if oldPos then
		oldPos = oldPos:nearestPosOnLine(boundaryOne, boundaryTwo)
	else
		oldPos = newPos
	end

	-- don't let the postion jump to much between frames
	return newPos * BLOCK_POS_ALPHA + oldPos * (1-BLOCK_POS_ALPHA)
end


function ManMark:run()
	local preferredPos = Defense.manMarkPos(self._targetRobot)
	local preferredDir = (World.Ball.pos - self._robot.pos):angle()

	-- pos before the defense area; the possibility of crashing into centerbacks was considered
	-- but disregarded because blocking a shot on the goal is more important,
	-- and the probabilty of it being the final position is small
	local intersectionDefenseArea = Field.intersectRayDefenseArea(preferredPos,
			World.Geometry.FriendlyGoal - preferredPos,
			self._robot.radius + DEFENSE_AREA_MIN_DISTANCE, false, false)

	local moveDest
	local basePos
	if intersectionDefenseArea then
		-- calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
		moveDest = preferredPos --+ (intersectionDefenseArea - preferredPos):setLength(0)--self._robot.shootRadius + World.Ball.radius)
		moveDest = self:_newPosRegardingOldPosition(moveDest, intersectionDefenseArea, self._oldPosition, BLOCK_POS_PRECISION)
		basePos = intersectionDefenseArea
	else
		-- case if there isn't an intersection with the defense area
		moveDest = preferredPos + (self._robot.pos-preferredPos):setLength(self._robot.shootRadius + World.Ball.radius)
		basePos = self._robot.pos
	end

	-- remember position for the next iteration
	self._oldPosition = moveDest

	local distToLine = self._robot.pos:distanceToLineSegment(basePos, preferredPos)
	if distToLine <= BLOCK_DIST_MAX then
		self._blockingShot = true
	elseif distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS then
		self._blockingShot = false
	end

	debug.set("moveDest posOnLine", moveDest)
	debug.set("moveDest distToLine", distToLine)
	
	local ignoreBall = false
	
	if self._blockingShot then
		--if closestOpponentRobot then
		--	moveDest = self:_moveToNearBlock(futureBall, closestOpponentRobot)
		--else
		--	ignoreBall = true
			moveDest = preferredPos + (World.Geometry.FriendlyGoal - preferredPos):setLength(
						World.Ball.radius + self._robot.shootRadius)
		--end
	end

	preferredPos = moveDest

	-- Quick fix to not interfere with goal shots
	local shooter, shootDest = next(self._inbox.shootDestination())
	if shootDest then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, shootDest.x, shootDest.y, self._robot.radius)
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir, nil, self._targetRobot.speed)
	self._send.moveDest("all", preferredPos)
end

return ManMark
