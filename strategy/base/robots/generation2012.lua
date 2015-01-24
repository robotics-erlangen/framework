--[[
--- Provides robot generations specific classes
module "Robot.Generation.Gen2012_2"
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
local Gen2012, Gen2012Mt = (require "../base/class")("Robot.Generation.Gen2012_2", Robot)

Gen2012Mt.__tostring = Robot.tostring

--- Robot specific constants
-- @class table
-- @name Gen2012_2.constants
Gen2012.constants = {
	dribblerSpinupTime = 0.4
}

--- Chip wrapper
-- @name Gen2012_2:chip
-- @param distance number - Distance to chip
function Gen2012:chip(distance)
	if self.id == 7 then -- prototype
		local power = distance / 4
		self:shootChip(math.bound(0.1, power, 1))
	else
		self:shootChip(1) -- chip is too powerless
	end
end

--- Shoot wrapper
-- @name Gen2012_2:_shoot
-- @param speed number - Target shoot speed
function Gen2012:_shoot(speed)
	local speedRatio = speed/self.maxShotLinear*8
	local lim = math.bound(0, 162827-20000*speedRatio, 162827)
	local power = -(math.sqrt(3)*math.sqrt(lim)-741)/1000
	self:shootLinear(math.bound(0.1, power, 1))
end

return Gen2012
