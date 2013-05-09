local AgentPool = (require "../base/class").new("AgentPool")
local debug = require "../base/debug"

AgentPool.robotLimit = math.huge

function AgentPool:init(agentType)
	self._robots = {}
	self._agents = {}
	self._agentType = agentType
end

function AgentPool:run(oldMessages, messages)
	for _, robot in pairs(self._robots) do
		if(not self._agents[robot]) then
			self._agents[robot] = self._agentType.create(robot)
		end
	end

	for robot, agent in pairs(self._agents) do
		messages:addAgent(robot, agent:run(messages:split(robot))
	end
end

-- remove agents and associated robots we no longer want to keep
function AgentPool:cleanupRobots()
	local agentsToKeep = {}
	for _, agent in pairs(self._agents) do
		if(agent:keepRobot()) then
			table.insert(agentsToKeep, agent)
		end
		for i in #agentsToKeep,self.robotLimit+1,-1 do -- +1 because of i >= limit
			self._agents[self._robots[i]] = nil
			self._robots[i] = nil
		end
	end
end

function AgentPool:takeRobot(robots)
	if #self._robots >= self.robotLimit then
		return
	end
	
	local robot = self._agentType.takeRobot(robots)
	if robot then
		table.insert(self._robots, robot)
	end
	return robot
end

function AgentPool:robots()
	return self._robots
end

function AgentPool:setRobotLimit(robotLimit)
	self._robotLimit = robotLimit
end

return AgentPool
