--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local ManMark = Class("Task.ManMark", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local Field = require "../base/field"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Defense = require "util/defense"



local BLOCK_DIST_MAX = 0.05
local BLOCK_DIST_HYSTERESIS = 0.02
local BLOCK_POS_ALPHA = 0.1
local BLOCK_POS_PRECISION = 0.01
local DEFENSE_AREA_MIN_DISTANCE = 0.24


function ManMark:_init(targetRobot)
	assert(targetRobot, "ManMark task needs a target robot")
	self._targetRobot = targetRobot
	self._oldPosition = nil
	self._blockingShot = false
	self._obstacleTable = {
		ignoreBall = true,
		inbox = self._inbox
	}
end

function ManMark:run()
	local preferredPos = Defense.manMarkPos(self._targetRobot)
	local preferredDir = (World.Ball.pos - self._robot.pos):angle()

	-- pos before the defense area; the possibility of crashing into centerbacks was considered
	-- but disregarded because blocking a shot on the goal is more important,
	-- and the probabilty of it being the final position is small
	local intersectionDefenseArea = Field.intersectRayDefenseArea(preferredPos,
			World.Geometry.FriendlyGoal - preferredPos,
			self._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)

	local moveDest
	local basePos
	if intersectionDefenseArea then
		-- calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
		moveDest = preferredPos --+ (intersectionDefenseArea - preferredPos):setLength(0)--self._robot.shootRadius + World.Ball.radius)
		moveDest = Defense.fastestPointInInterval(self._robot, moveDest, intersectionDefenseArea,
							self._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA)
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

	-- local ignoreBall = false

	if self._blockingShot then
		--if closestOpponentRobot then
		--	moveDest = self:_moveToNearBlock(futureBall, closestOpponentRobot)
		--else
		--	ignoreBall = true
			moveDest = preferredPos + (World.Geometry.FriendlyGoal - preferredPos):setLength(
						World.Ball.radius + self._robot.shootRadius)
		--end
	end

	self._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 4 * self._robot.radius + 0.13

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	preferredPos = moveDest

	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir, nil, self._targetRobot.speed)
	self._send.moveDest("all", preferredPos)
end

return ManMark
