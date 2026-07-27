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

local AgentHelper = {}

local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"


local StaticBehavior = Class("test.helper.agent.StaticBehavior", require "agent/base/behavior")

function StaticBehavior:_init()
	self._staticTask = nil
	self._staticParameters = nil
end

function StaticBehavior:check()
	return true
end

function StaticBehavior:_updateTask()
	return self._staticTask, self._staticParameters
end

function StaticBehavior:_setStatic(staticTask, staticParameters)
	self._staticTask = staticTask
	self._staticParameters = staticParameters
end


function AgentHelper.staticBehavior(task, parameters)
	return function (agent)
		local behavior = StaticBehavior(agent)
		behavior:_setStatic(task, parameters)
		return behavior
	end
end



local StaticAgent = Class("test.helper.agent.StaticAgent", require "agent/base/simpleagent")


function AgentHelper.staticAgent(robot, behavior, messaging)
	StaticAgent._behaviors = { behavior }
	return StaticAgent(robot, messaging)
end



function AgentHelper.defaultCoordinator(poolname, agent, agentCount)
	local coord = nil

	local function run()
		if coord == nil then
			local trainer = Trainer()
			local pools = { [poolname] = AgentPool(agent, agentCount) }
			local poolGroups = { { pools[poolname] } }
			coord = Coordinator(trainer, pools, poolGroups)
		end
		coord:run()
	end
	return run
end


return AgentHelper
