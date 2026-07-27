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

local BallEvadingMoveToPos = Class("Task.BallEvadingMoveToPos", require "task/base")

local Constants = require "../base/constants"
local geom = require "../base/geom"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function BallEvadingMoveToPos:_init(pos, dir)
	self._pos = pos
	self._dir = dir
	self._obstacleTable = {
		ignoreBall = false,
		inbox = self._inbox
	}
end

function BallEvadingMoveToPos:run()
	local minDist = Constants.stopBallDistance + World.Ball.radius + self._robot.radius

	local pos = self._pos
	if pos:distanceTo(World.Ball.pos) < minDist - 0.01 then
		pos = geom.intersectLineCircle(World.Geometry.FriendlyGoal,
			World.Geometry.FriendlyGoal - self._pos, World.Ball.pos, minDist)
	end

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	local dir = self._dir or (World.Ball.pos - pos):angle()
	self._robot.trajectory:update(ToTarget, pos, dir)
end

return BallEvadingMoveToPos
