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

local AbilityShoot = require "task/ability/shoot"
local ChipToPos = Class("Task.ChipToPos", require "task/base", AbilityShoot)

local PathHelper = require "trajectory/pathhelper"

function ChipToPos:_init(firstContactPos, targetTime, ballReceiptPos, precision)
	self._firstContactPos = firstContactPos
	self._targetTime = targetTime
	self._ballReceiptPos = ballReceiptPos
	self._chipPrecision = precision
end

function ChipToPos:run()
	local obstacleTable = {
		inbox = self._inbox
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self:_chipToPos(self._firstContactPos, self._targetTime, self._ballReceiptPos, self._chipPrecision)
end

return ChipToPos
