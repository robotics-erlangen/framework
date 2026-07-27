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

local BallEscort = Class("Task.BallEscort", require "task/base")

local Field = require "../base/field"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local obstacleTable = {
	ignoreBall = false,
	extraBallDistance = 0.25,
	ignorePass = true,
}

function BallEscort:_init(opponentRobot)
	self._opponentRobot = opponentRobot
end

function BallEscort:run()
	local target = self._opponentRobot and self._opponentRobot.pos or World.Geometry.FriendlyGoal
	local pos = World.Ball.pos + (target - World.Ball.pos):setLength(0.3 + self._robot.radius)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	local ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
	if ballOutPos then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, ballOutPos.x, ballOutPos.y, self._robot.radius, "Ballescort", 68)
	end

	self._robot.trajectory:update(ToTarget, pos, (self._robot.pos - World.Ball.pos):angle())
end

return BallEscort
