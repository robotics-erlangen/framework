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

local SuggestPass = require "task/ability/suggestpass"
local OverchipReceiver = Class("Task.OverchipReceiver", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"
local G = World.Geometry

local DISTANCE_FACTOR = 22 -- used to determine the passSuggestion position
local DISTANCE_TO_DEFENSE_AREA = 1 -- faraway robots and goalie don't interfere with our runup


function OverchipReceiver:_init()
	local goalVector = G.OpponentGoal - World.Ball.pos
	self._obstacleRobot = nil
	self._pos = goalVector:setLength(0.5 + 3 * self._robot.radius)
end

function OverchipReceiver:_updateObstacleRobot()
	self._obstacleRobot = nil
	local ballPos = World.Ball.pos
	local goal = G.OpponentGoal
	local boundary = G.FieldHeightHalf - (G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA)
	local maxLength = -math.huge

	-- check the distance between enemy robots and the goalVector
	for _, robot in pairs(World.OpponentRobots) do
		local orthogonalProjection = robot.pos:orthogonalProjection(goal, ballPos)
		local projectedVector = orthogonalProjection - ballPos
		if robot.pos.y > ballPos.y and robot.pos.y < boundary
				and robot.pos.y > ballPos.y and robot.pos.y < boundary
				and robot.pos:distanceToLineSegment(ballPos, goal) < 0.3
				and projectedVector:length() > maxLength then
			self._obstacleRobot = robot
			maxLength = projectedVector:length()
		end
	end
end

function OverchipReceiver:_updatePos()
	local ballPos = World.Ball.pos
	local goal = G.OpponentGoal
	local goalVector = goal - ballPos
	if self._obstacleRobot then
		local orthogonalProjection = self._obstacleRobot.pos:orthogonalProjection(ballPos, goal)
		self._pos = orthogonalProjection + goalVector:setLength(3 * self._robot.radius)
	else
		self._pos = World.Ball.pos + goalVector:setLength(0.5 + 3 * self._robot.radius)
	end
end

function OverchipReceiver:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, {ignorePass = true})
	self:_updateObstacleRobot()
	self:_updatePos()
	local dir = (G.OpponentGoal - self._pos):angle()
	local ballPos = self._pos + Vector.fromAngle(dir):setLength(DISTANCE_FACTOR * self._robot.radius)
	local _, time = self._robot.trajectory:update(ToTarget, self._pos, dir)
	self:_suggestPass(ballPos, nil, time, false, true)
end

return OverchipReceiver
