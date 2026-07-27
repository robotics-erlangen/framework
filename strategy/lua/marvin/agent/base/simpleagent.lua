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
local SimpleAgent = Class("Agent.Base.SimpleAgent", Base)

local World = require "../base/world"


-- Child class must set _behaviors
-- SimpleAgent._behaviors = {}

function SimpleAgent:init(robot, messaging)
	Base.init(self, robot, messaging)
	self.beOffensive = false
end

function SimpleAgent.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if SimpleAgent.checkRobot(robot) then
			return robot
		end
	end
end

function SimpleAgent.checkRobot(robot)
	return robot.isVisible and robot ~= World.FriendlyKeeper and not robot.userControl
end

function SimpleAgent:keepRobot()
	return self.checkRobot(self._robot)
end

function SimpleAgent:rateRobot()
	return 1
end

return SimpleAgent
