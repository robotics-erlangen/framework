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

local AgentPool = Class("AgentPool")


function AgentPool:init(agentType, robotLimit)
	-- robots and agents are mapped 1:1 to each other
	self._agents = {}
	self._agentType = agentType
	if robotLimit == nil then
		self._robotLimit = math.huge
	else
		self._robotLimit = robotLimit
	end
end

function AgentPool:run()
	for _, agent in ipairs(self._agents) do
		agent:run()
	end
end

local function sortByRating(a1, a2)
	return a1:rateRobot() > a2:rateRobot()
end

-- remove agents and associated robots we no longer want to keep
function AgentPool:cleanupRobots()
	local agents = {} -- agents to keep
	for _, agent in ipairs(self._agents) do
		if(agent:keepRobot()) then
			table.insert(agents, agent)
		end
	end

	-- only sort if we have too many robots
	if self._robotLimit < #agents then
		-- sort with by decreasing importance
		table.sort(agents, sortByRating)
		table.truncate(agents, self._robotLimit)
	end
	self._agents = agents
end

function AgentPool:takeRobot(robots, messaging)
	if #self._agents >= self._robotLimit then
		return
	end

	local robot = self._agentType.takeRobot(robots)
	if robot then
		table.insert(self._agents, self._agentType(robot, messaging))
	end
	return robot
end

function AgentPool:robots()
	local robots = {}
	for _, agent in ipairs(self._agents) do
		table.insert(robots, agent:robot())
	end
	return robots
end

function AgentPool:removeRobot(robot)
	for _, agent in ipairs(self._agents) do
		if agent:robot() == robot then
			table.removeValue(self._agents, agent)
			return true
		end
	end
	return false
end

function AgentPool:setRobotLimit(robotLimit)
	self._robotLimit = robotLimit
end

return AgentPool
