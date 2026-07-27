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

local World = require "../base/world"
local Ball = require "observer/ball"


local situation = {
	refereeState = "GameForce",
	gameStage = "SecondHalf",
	ball = { pos = Vector(-0.3,1), speed = Vector(-7.3011e-15,4.162e-15) },
	blueGoalie = 1,
	blueRobots = {
		[0] = {
			pos = Vector(0.3,0.2),
			dir = Vector.fromAngle(-math.pi*1.5),
			speed = Vector(-1.20375e-07,-7.21853e-06),
			angularSpeed = Vector.fromAngle(-3.26864e-06)
		},
	},
	yellowGoalie = 0
}

local shotObserved = false
local startTime
situation.observe = function()
	startTime = startTime or World.Time
	local timeDiff = World.Time - startTime
	if Ball.isShot() and not shotObserved then
		log("Ball shot after " .. timeDiff .. " seconds")
		shotObserved = true
	end
end

return situation
