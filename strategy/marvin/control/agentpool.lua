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

	-- sort with by decreasing importance
	table.sort(agents, sortByRating)
	table.truncate(agents, self._robotLimit)
	self._agents = agents
end

function AgentPool:takeRobot(robots)
	if #self._agents >= self._robotLimit then
		return
	end

	local robot = self._agentType.takeRobot(robots)
	if robot then
		table.insert(self._agents, self._agentType(robot))
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
