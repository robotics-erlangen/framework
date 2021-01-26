--[[
--- Provides robot generations specific classes
module "Robot.Generation.Gen2020_4"
]]--

--[[***********************************************************************
*   Copyright 2020 Alexander Danzer, Michael Eischer, Andreas Wendler     *
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
local Gen2020 = (require "../base/class")("Robot.Generation.Gen2020_"..Robot.GENERATION_2020_ID, Robot)

--- Robot specific constants
-- @class table
-- @name Gen2020_4.constants
Gen2020.constants = {
	dribblerSpinupTime = 0.4
}

return Gen2020
