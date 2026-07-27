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

local Base = require "agent/base/agent"
local Hidden = Class("Agent.Hidden", Base)

local Default = require "agent/hidden/default"


Hidden._behaviors = {
	Default
}

function Hidden.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if not robot.isVisible then
			return robot
		end
	end
end

function Hidden:keepRobot()
	return not self._robot.isVisible and not self._robot.userControl
end

function Hidden:rateRobot()
	return 0
end

return Hidden
