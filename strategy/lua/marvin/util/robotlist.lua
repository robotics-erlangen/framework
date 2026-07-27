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

local RobotList = {}

local Cache = require "../base/cache"


function RobotList.join(listA, listB)
	local joined = table.copy(listA)
	table.append(joined, listB)
	return joined
end
RobotList.join = Cache.forFrame(RobotList.join)

function RobotList.excludeRobot(list, robot)
	local result = table.copy(list)
	for i, r in ipairs(list) do
		if r == robot then
			table.remove(result, i)
			break
		end
	end
	return result
end
RobotList.excludeRobot = Cache.forFrame(RobotList.excludeRobot)

function RobotList.excludeRobots(list, robots)
	local result = {}
	for _, r in ipairs(list) do
		local found = false
		for _, robot in ipairs(robots) do
			if r == robot then
				found = true
			end
		end
		if not found then
			table.insert(result, r)
		end
	end
	return result
end
RobotList.excludeRobots = Cache.forFrame(RobotList.excludeRobots)

return RobotList
