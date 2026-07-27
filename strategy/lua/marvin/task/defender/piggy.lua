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

local Piggy = Class("Task.Piggy", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local UtilDefense = require "util/defense"

function Piggy:_init(targetRobot)
	assert(targetRobot, "Piggy task needs a target robot")
	self._targetRobot = targetRobot
end

function Piggy:run()
	local obstacleTable = { inbox = self._inbox}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local piggyPos = UtilDefense.piggyPos(self._targetRobot)

	self._send.moveDest("all", piggyPos)

	local dir = (World.Ball.pos - self._targetRobot.pos):angle()
	self._robot.trajectory:update(ToTarget, piggyPos, dir, nil, self._targetRobot.speed)
end

return Piggy
