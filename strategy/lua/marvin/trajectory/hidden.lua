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

local Hidden = Class("Trajectory.Hidden", (require "../base/trajectory").Base)


-- only works for hidden robots
function Hidden:_init()
end

function Hidden:update(speedForward, speedSide, omega)
	assert(not self._robot.isVisible, "can only control invisible robots")
	assert(speedForward ~= nil and speedSide ~= nil and omega ~= nil, "missing parameters!")
	return { v_f = speedForward, v_s = speedSide, omega = omega }, self._robot.pos, 0
end

function Hidden:canHandle()
	return true
end

return Hidden
