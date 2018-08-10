let AgentPool = Class("AgentPool")


function AgentPool:init (agentType, robotLimit) {
	// robots and agents are mapped 1:1 to each other
	self._agents = {}
	self._agentType = agentType
	if (robotLimit == nil) {
		self._robotLimit = math.huge
	} else {
		self._robotLimit = robotLimit
	}
}

function AgentPool:run () {
	for (_, agent in ipairs(self._agents)) {
		agent:run()
	}
}

let sortByRating = function (a1, a2) {
	return a1:rateRobot() > a2:rateRobot()
}

// remove agents and associated robots we no longer want to keep
function AgentPool:cleanupRobots () {
	let agents = {} // agents to keep
	for (_, agent in ipairs(self._agents)) {
		if(agent:keepRobot()) then
			table.insert(agents, agent)
		}
	}

	// only sort if we have too many robots
	if (self._robotLimit < #agents) {
		// sort with by decreasing importance
		table.sort(agents, sortByRating)
		table.truncate(agents, self._robotLimit)
	}
	self._agents = agents
}

function AgentPool:takeRobot (robots, messaging) {
	if (#self._agents >= self._robotLimit) {
		return
	}

	let robot = self._agentType.takeRobot(robots)
	if (robot) {
		table.insert(self._agents, self._agentType(robot, messaging))
	}
	return robot
}

function AgentPool:robots () {
	let robots = {}
	for (_, agent in ipairs(self._agents)) {
		table.insert(robots, agent:robot())
	}
	return robots
}

function AgentPool:removeRobot (robot) {
	for (_, agent in ipairs(self._agents)) {
		if (agent:robot() == robot) {
			table.removeValue(self._agents, agent)
			return true
		}
	}
	return false
}

function AgentPool:setRobotLimit (robotLimit) {
	self._robotLimit = robotLimit
}

return AgentPool
