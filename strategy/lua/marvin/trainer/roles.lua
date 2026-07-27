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

local Roles = {}

local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"


local ROLE_HYSTERESIS = 0.05

function Roles:init()
	self._exclusiveRoles = {}
end

function Roles:_chooseExclusiveRoles()
	local roleHysteresis = ROLE_HYSTERESIS
	if Referee.isStopState() then
		roleHysteresis = 1
	end

	local roleMsgs = self._inbox.exclusiveRole()
	local roleApplications = {}
	for robot, applications in pairs(roleMsgs) do
		for _, application in ipairs(applications) do
			for role, rating in pairs(application) do
				if not roleApplications[role] then
					roleApplications[role] = {}
				end
				roleApplications[role][robot] = rating
			end
		end
	end

	local exclusiveRoles = {} -- ensure that special roles are removed if no one applies
	for role, applications in pairs(roleApplications) do
		local bestRobot = nil
		local bestRating = -math.huge
		for robot, rating in pairs(applications) do
			if self._exclusiveRoles[role] == robot then
				rating = rating + roleHysteresis
			end
			if rating > bestRating then
				bestRobot = robot
				bestRating = rating
			end
		end
		if bestRobot then
			exclusiveRoles[role] = bestRobot
			self._send[role]("all", bestRobot)

			vis.addCircle("tr/roles: "..role, bestRobot.pos, 0.12,
				World.TeamIsBlue and vis.colors.blue or vis.colors.yellow, true, true)
		end
	end
	self._exclusiveRoles = exclusiveRoles
end

return Roles
