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
local DebugChip = Class("Task.DebugChip", require "task/base", Shoot)

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"


function DebugChip:_init(pos, distance)
	assert(distance, "How long should I chip?")
	self._timer = 200
	self._pos = pos
	self._distance = distance
	self._wasShot = false
	self._obstacleTable = {
		ignoreBall = true,
		ignoreGoals = true,
		ignorePass = true,
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = true,
	}
end

function DebugChip:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	if Ball.isShot() then
		self._wasShot = true
	end

	local target = self._robot.pos + World.Ball.pos:copy():setLength(self._distance) * -1
	if self._wasShot or self._timer > 0 then--self._robot.pos:distanceTo(self._pos) > 0.15 then
		self._robot.trajectory:update(ToTarget, self._pos, math.pi/2, nil, Vector(0,0))
		self._timer = self._timer - 1
	else
		self:_chipToPos(target, nil, nil)
	end

end

return DebugChip
