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

local RotateAndShoot = {}

local geom = require "../base/geom"
local World = require "../base/world"
local Direct = require "trajectory/direct"


function RotateAndShoot:init()
	self._RAS_startTime = nil
end

function RotateAndShoot:_rotateAndShoot(destAngle)
	if not self._RAS_startTime then
		self._RAS_startTime = World.Time
	end
	local t = World.Time - self._RAS_startTime

	-- 1 when rotating ccw, -1 when rotating cw
	local invert = self._robot.dir < destAngle and 1 or -1
	local toBall = (World.Ball.pos - self._robot.pos):normalize()
	local sidewards = toBall:copy():perpendicular() * invert


	local vf_min, vf_max, vf_t = 0.5, 2.0, 0.2
	local vs_min, vs_max, vs_t = 0.5, 2.0, 0.1
	local vf = math.bound(vf_min, t * vf_max / vf_t, vf_max)
	local vs = math.bound(vs_min, (vs_t - t) * vs_max / vs_t, vs_max)

	--HACK
	if t < 0.12 then
		vf = 0
	end

	local rotate = 0.4 * (2*math.pi) * invert
	if math.abs(geom.getAngleDiff(self._robot.dir, destAngle)) < 8 * math.pi/180 then
		self._robot:shoot(math.huge)
	end


	local move = toBall * vf + sidewards * vs
	self._robot.trajectory:update(Direct, move, nil, rotate)
	-- self._robot:setDribblerSpeed(1)
end

return RotateAndShoot
