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

local Circuit = Class("Task.Circuit", require "task/base", require "task/ability/suggestpass")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function Circuit:_init(center, angleOffset, radius, passPos, anonym)
	self._center = center
	self._angleOffset = angleOffset
	self._radius = radius or 0.5
	self._passPos = passPos
	self._anonym = anonym
	self._obstacleTable = {
		ignorePass = true
	}
end

function Circuit:run()
	local angle = (World.Time % 1000) % (math.pi*2) + self._angleOffset
	local pos = self._center + Vector.fromAngle(angle) * self._radius
	local dir = (World.Ball.pos - pos):angle()

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)
	self._robot.trajectory:update(ToTarget, pos, dir)

	if self._passPos then
		self:_suggestPassRobotPosition(self._passPos,nil,nil, self._anonym)
	end
end

return Circuit
