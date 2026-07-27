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

local Shoot = require "task/ability/shoot"
local ChipAway = Class("Task.ChipAway", require "task/base", Shoot)
local World = require "../base/world"
local vis = require "../base/vis"

local PathHelper = require "trajectory/pathhelper"

local obstacleTable = {
    ignorePass = true
}

function ChipAway:_init()
end

function ChipAway:run()
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	-- chip to opponent's defense line, so that the ball would roll into the goal's center
	local oppGoal = World.Geometry.OpponentGoal
	local chipPos = oppGoal + (self._robot.pos - oppGoal):setLength(World.Geometry.DefenseRadius)
	self:_chipToPos(chipPos)
	vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true)
end

return ChipAway
