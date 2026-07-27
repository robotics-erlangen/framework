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

local StopAttack = Class("Task.StopAttack", require "task/base")

local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local Math = require "../base/math"
local World = require "../base/world"
local Physics = require "observer/physics"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local UtilDefense = require "util/defense"
local RobotList = require "util/robotlist"

local POSITION_PADDING = 0.2 -- safety distance

function StopAttack:_init(minDistToBall)
	self._focusPoint = Vector(0, -World.Geometry.FieldHeightHalf + 4 * self._robot.radius)
	self._side = World.Ball.pos.x < 0 and "left" or "right"
	self._defenseHysteresis = false
	self._minDistToBall = minDistToBall or Constants.stopBallDistance
end

-- normalize angle created by direction to be always relative to segment ball to field border
local function getNormalizedAngle(direction)
	local angle = direction:angle()
	if World.Ball.pos.x > 0 then
		angle = geom.normalizeAnglePositive(angle)
	end
	return angle
end

function StopAttack:run()
	local stopRadius = self._minDistToBall + self._robot.radius + POSITION_PADDING
	local pos = World.Ball.pos + (self._focusPoint - World.Ball.pos):setLength(stopRadius)
	local driveAngle = (World.Ball.pos - pos):angle()

	local opponentShooter, dist = UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos)

	-- hysteresis on distance between opponent shooter and ball
	if self._defenseHysteresis then
		dist = dist - 0.5
	end

	-- try to always be where the opponent shooter will try to shoot
	local isOpponentFreekickState = World.RefereeState == "IndirectDefensive" or World.RefereeState == "DirectDefensive"
	local defendOpponentPasses = World.Ball.pos.y > 0 and isOpponentFreekickState

	local passReceivers = RobotList.excludeRobots(World.OpponentRobots, {opponentShooter, World.OpponentKeeper})
	if dist < 0.2 + self._robot.radius and defendOpponentPasses and #passReceivers > 0 then
		local minAngle = math.huge
		local maxAngle = -math.huge
		for _, robot in ipairs(passReceivers) do
			local angle = getNormalizedAngle(Field.limitToAllowedField(Physics.robotBrakePos(robot), robot.radius) - World.Ball.pos)
			if World.Ball.pos.x > 0 then
				angle = geom.normalizeAnglePositive(angle)
			end
			if angle < minAngle then
				minAngle = angle
			end
			if angle > maxAngle then
				maxAngle = angle
			end
		end
		local relativeAngle = getNormalizedAngle(World.Ball.pos - opponentShooter.pos)
		local boundedAngle = Math.bound(minAngle, relativeAngle, maxAngle)
		local opponentDirection = getNormalizedAngle(Vector.fromAngle(opponentShooter.dir))
		local boundedOppDirection = Math.bound(minAngle, opponentDirection, maxAngle)
		local middleAngle = (boundedAngle + boundedOppDirection) / 2

		pos = World.Ball.pos + Vector.fromAngle(middleAngle):setLength(stopRadius)
		-- try to hit the side of the opponent robot to reflect the ball out of the field
		driveAngle = (opponentShooter.pos - pos):angle() + 0.02

		self._defenseHysteresis = true
		self._robot:setDribblerSpeed(0.8) -- might be quite loud
	else
		-- position between ball and goal
		self._defenseHysteresis = false
		if Field.isInFriendlyDefenseArea(pos, 4 * self._robot.radius + 0.05) then
			local intersections = Field.intersectCircleDefenseArea(World.Ball.pos,
					stopRadius, 4 * self._robot.radius + 0.05, true)
			if #intersections > 0 then
				pos = nil
				local distanceToSqMin = math.huge
				for _,p in ipairs(intersections) do
					local distanceToSqCur = p:distanceToSq(World.Geometry.FriendlyGoal)
					if distanceToSqCur < distanceToSqMin then
						pos = p
						distanceToSqMin = distanceToSqCur
					end

--					TODO: Think!
--					if not pos or (self._side == "left" and p.x < pos.x) or
--							(self._side == "right" and p.x > pos.x) then
--						pos = p
--					end
				end
			end
		end
		if self._side == "left" and World.Ball.pos.x < -0.3 then
			self._side = "right"
		elseif self._side == "right" and World.Ball.pos.x > 0.3 then
			self._side = "left"
		end

		if World.RefereeState == "DirectDefensive" or World.RefereeState == "IndirectDefensive" then
			self._robot:setDribblerSpeed(0.6)
		end
	end

	local obstacleTable = {
		ignorePass = false,
		inbox = self._inbox
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	self._robot.trajectory:update(ToTarget, pos, driveAngle)
end

return StopAttack
