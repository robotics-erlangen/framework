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


function AgentHelper.staticAgent(robot, behavior)
	StaticAgent._behaviors = { behavior }
	return StaticAgent(robot)
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
