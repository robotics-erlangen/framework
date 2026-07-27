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

local ForceShoot = {}

local debug = require "../base/debug"
local World = require "../base/world"


local FORCE_SHOOT_DELAY = 0.03 -- delay forced kick by this time
local ENABLE_FORCE_SHOOT = false

-- when using this ability, make sure to set self._forceShootTimer to nil
-- if the kick was canceled but the task stays active

function ForceShoot:init()
	self._forceShootTimer = nil
end

function ForceShoot:_doForceShoot()
	if self._robot.radioResponse then
		debug.set("light barrier", self._robot.radioResponse.ball_detected)
	end
	if not ENABLE_FORCE_SHOOT then
		return
	end
	-- Ignore the IR if the robot has the ball
	local relpos = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
	-- assume the ball is "pushed" into the robot due to tracking latency
	if relpos.x < self._robot.shootRadius + World.Ball.radius - 0.002 and World.Ball:isPositionValid() and self._robot:hasBall(World.Ball, -0.01) then
		-- initialize if neccessary
		self._forceShootTimer = self._forceShootTimer or World.Time
		if World.Time - self._forceShootTimer >= FORCE_SHOOT_DELAY then
			debug.set("force shoot", true)
			self._robot:forceShoot()
		end
	else
		-- reset time
		self._forceShootTimer = World.Time
	end
end

return ForceShoot
