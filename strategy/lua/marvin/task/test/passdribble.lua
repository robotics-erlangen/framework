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

local CatchBall = require "task/ability/catchball"
local PassDribble = Class("Task.PassDribble", require "task/base", CatchBall)

local PathHelper = require "trajectory/pathhelper"

local obstacleTable = {
    ignorePass = true
}

function PassDribble:_init(targetRobot)
	self._targetRobot = targetRobot
end

function PassDribble:run()
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(1)
	self:_catchBall(self._targetRobot.pos, 0, nil)
end

return PassDribble
