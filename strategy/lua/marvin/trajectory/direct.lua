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

local Direct = Class("Trajectory.Direct", (require "../base/trajectory").Base)

local Coordinates = require "../base/coordinates"
local geom = require "../base/geom"


function Direct:_init()
end

-- only targetDir or rotateSpeed may be passed!
-- accel is optional
function Direct:update(speed, targetDir, rotateSpeed, accel)
	speed = Coordinates.toGlobal(speed)
	if accel then
		accel = Coordinates.toGlobal(accel)
	else
		accel = Vector(0, 0)
	end
	-- play motion controller
	local robotSpeed = Coordinates.toGlobal(self._robot.speed)
	local k_v = 0.5
	speed = speed + (speed - robotSpeed) * k_v

	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotDir = Coordinates.toGlobal(self._robot.dir)
	assert(targetDir == nil or rotateSpeed == nil, "rotating while having a fixed direction makes no sense")

	if rotateSpeed == nil then
		local limitRot = 4 * math.pi
		local k_omega = 10
		targetDir = Coordinates.toGlobal(targetDir)
		local error_phi = geom.getAngleDiff(robotDir, targetDir)
		rotateSpeed = math.bound(-limitRot, error_phi * k_omega, limitRot)
	end

	local spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = accel.x / 2, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = accel.y / 2, a3 = 0 },
		phi = { a0 = robotDir, a1 = rotateSpeed, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, self._robot.pos, 0
end

function Direct:canHandle()
	return true
end

return Direct
