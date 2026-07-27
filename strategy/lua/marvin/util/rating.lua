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

local Rating = {}

local Physics = require "observer/physics"


function Rating.timeToRating(time)
	if time < 0 then
		return 1
	else
		return 1/(time+1)^2
	end
end

function Rating.posToRating(robot, targetPos)
	return Rating.timeToRating(Physics.robotTimeToPos(robot, targetPos, Vector(0, 0)))
end

function Rating.valueToRating(value, zero, one)
	return math.bound(0, (value - zero) / (one - zero), 1)
end

return Rating
