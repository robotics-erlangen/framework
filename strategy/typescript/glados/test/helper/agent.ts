let AgentHelper = {}

let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Trainer = require "trainer/trainer"


let StaticBehavior = Class("test.helper.agent.StaticBehavior", require "agent/base/behavior")

function StaticBehavior:_init () {
	self._staticTask = nil
	self._staticParameters = nil
}

function StaticBehavior:check () {
	return true
}

function StaticBehavior:_updateTask () {
	return self._staticTask, self._staticParameters
}

function StaticBehavior:_setStatic (staticTask, staticParameters) {
	self._staticTask = staticTask
	self._staticParameters = staticParameters
}


function AgentHelper.staticBehavior (task, parameters) {
	return function (agent)
		let behavior = StaticBehavior(agent)
		behavior:_setStatic(task, parameters)
		return behavior
	}
}



let StaticAgent = Class("test.helper.agent.StaticAgent", require "agent/base/simpleagent")


function AgentHelper.staticAgent (robot, behavior, messaging) {
	StaticAgent._behaviors = { behavior }
	return StaticAgent(robot, messaging)
}



function AgentHelper.defaultCoordinator (poolname, agent, agentCount) {
	let coord = nil

	let run = function () {
		if (coord == nil) {
			let trainer = Trainer()
			let pools = { [poolname] = AgentPool(agent, agentCount) }
			let poolGroups = { { pools[poolname] } }
			coord = Coordinator(trainer, pools, poolGroups)
		}
		coord:run()
	}
	return run
}


return AgentHelper
