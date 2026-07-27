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

local Groups = {}

function Groups:init()
	local groupClasses = {
		require "group/centerback",
		require "group/moves",
		require "group/striker",
		require "group/midfield"
	}

	self._groupList = {}
	for _,group in ipairs(groupClasses) do
		table.insert(self._groupList, group())
	end
end

function Groups:setGroups(groupList)
	self._groupList = groupList
end

function Groups:_runGroups()
	-- robot -> { groupname -> application }
	local groupApplications = self._inbox.groupApplication()

	-- groupname -> { robot -> application }
	local robotApplications = {}

	for _,group in ipairs(self._groupList) do
		robotApplications[group.name] = {}
	end
	for robot, msg in pairs(groupApplications) do
		for _, app in ipairs(msg) do
			local application = robotApplications[app.name]
			if not application then
				error("No group with name '" .. app.name .. "' found")
			end
			application[robot] = app.payload
		end
	end

	for _,group in ipairs(self._groupList) do
		local messages = robotApplications[group.name]

		group:run(self._send, self._inbox, messages)
	end
end

return Groups
