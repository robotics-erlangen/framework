--[[
--- Provides robot generations specific classes
module "Robot.Generation.Gen2014_3"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
*   Robotics Erlangen e.V.                                                *
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

local Robot = require "../base/robot"
local Gen2014 = (require "../base/class")("Robot.Generation.Gen2014_3", Robot)

--- Robot specific constants
-- @class table
-- @name Gen2014_3.constants
Gen2014.constants = {
	dribblerSpinupTime = 0.4
}

--- Chip wrapper
-- @name Gen2014_3:chip
-- @param distance number - Distance to chip
function Gen2014:chip(distance)
	self:shootChip(math.bound(0.05, distance, self.maxShotChip))
end

--- Shoot wrapper
-- @name Gen2014_3:_shoot
-- @param speed number - Target shoot speed
function Gen2014:_shoot(speed)
	self:shootLinear(math.bound(0.05, speed, self.maxShotLinear))
end

return Gen2014
