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

local BallRotate = Class("Trajectory.BallRotate", (require "../base/trajectory").Base)

local Coordinates = require "../base/coordinates"


-- only works for hidden robots
function BallRotate:_init()
end

function BallRotate:update(speedForward, radius, turnRight)
	local mu = 0.15  -- friction between ball and floor
	local g = 9.81  -- gravity
	local omega = speedForward / radius
	local dirSign = turnRight and -1 or 1

	local phi = math.atan(mu * g * omega * omega * radius)
	local localSpeed = Vector.fromAngle(dirSign * phi) * speedForward
	self._robot:setDribblerSpeed(0.08)

	-- assert(not self._robot.isVisible, "can only control invisible robots")
	--return { v_f = localSpeed.x, v_s = localSpeed.y, omega = dirSign * omega }, self._robot.pos, 0


	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotDir = Coordinates.toGlobal(self._robot.dir)
	local speed = localSpeed:copy():rotate(robotDir + math.pi/2)

	local spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = 0, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = 0, a3 = 0 },
		phi = { a0 = robotDir, a1 = dirSign * omega, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, self._robot.pos, 0
end

function BallRotate:canHandle()
	return true
end

return BallRotate
