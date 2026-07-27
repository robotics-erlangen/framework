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

local Base = require "agent/base/behavior"
local Move = Class("Agent.Shared.RescueFromDefenseArea", Base)

local World = require "../base/world"
local MoveToPos = require "task/shared/movetopos"

local function calculateRescuePosition(robot)
	local x = math.sign(robot.pos.x) * (World.Geometry.DefenseStretchHalf + 0.2)
	local y = math.sign(robot.pos.y) * (World.Geometry.FieldHeightHalf + robot.radius + 0.02)
	return Vector(x, y)
end

function Move:check()
	return World.RefereeState ~= "BallPlacementOffensive" and math.abs(self._robot.pos.y) > World.Geometry.FieldHeightHalf and
		math.abs(self._robot.pos.x) + 0.1 < math.abs(calculateRescuePosition(self._robot).x)
end

function Move:_updateTask()
	return MoveToPos, {calculateRescuePosition(self._robot)}
end

return Move
