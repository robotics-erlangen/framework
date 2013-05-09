local AgentPool = (require "../base/class").new("AgentPool")
local debug = require "../base/debug"

function AgentPool:init(agentType)
	self._robots = {}
	self._agents = {}
	self._agentType = agentType
	self._robotLimit = math.huge
end

function AgentPool:run(oldMessages, messages)
	for _, robot in pairs(self._robots) do
		if(not self._agents[robot]) then
			self._agents[robot] = self._agentType.create(robot)
		end
	end

	for robot, agent in pairs(self._agents) do
		messages:addAgent(robot, agent:run(oldMessages))
	end
end

-- remove agents and associated robots we no longer want to keep
function AgentPool:cleanupRobots()
	local robotsToKeep = {}
	local agentsToKeep = {}
	for _, robot in pairs(self._robots) do
		if(self._agents[robot]:keepRobot()) then
			table.insert(robotsToKeep, robot)
			agentsToKeep[robot] = self._agents[robot]
		end
	end
	
	for i = #agentsToKeep, self._robotLimit+1, -1 do -- +1 because of i >= limit
		agentsToKeep[robotsToKeep[i]] = nil
		robotsToKeep[i] = nil
	end
	
	self._robots = robotsToKeep
	self._agents = agentsToKeep
end

function AgentPool:takeRobot(robots)
	if #self._robots >= self._robotLimit then
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
