local Entrypoints = require "../base/entrypoints"

local AgentTest = (require "../base/class").new("Control.AgentTest")
local TestConfig = require "tests/testconfig"

local Agent = {
	Attacker = require "agent/attacker",
	Defender = require "agent/defender",
	Keeper = require "agent/keeper",
	Hidden = require "agent/hidden"
}
local Behaviour = {
	SharedHalt = require "agent/shared/halt",
	SharedPlay = require "agent/shared/play",
	KeeperDefault = require "agent/keeper/default",
	KeeperHandleBall = require "agent/keeper/handleball",
	AttackerDuel = require "agent/attacker/duel",
	AttackerReceivePass = require "agent/attacker/receivepass",
	AttackerDuel = require "agent/attacker/duel",
	AttackerShoot = require "agent/attacker/shoot",
	AttackerFreeKick = require "agent/attacker/freekick",
	AttackerDefault = require "agent/attacker/default",
	DefenderCenterBack = require "agent/defender/centerback",
	DefenderDefault = require "agent/defender/default",
	DefenderHandleBall = require "agent/defender/handleball",
}
local TestAgent = require "agent/base/testagent"
local AgentPool = require "control/agentpool"
local World = require "../base/world"
local Messages = require "control/messages"
local Message = require "agent/base/message"

function AgentTest:init(pools, behaviours)
	local allRobots = table.copy(World.FriendlyRobots)
	self._pools = {}
	for _, pool in ipairs(pools) do
		for agentType, numRobots in pairs(pool) do
			table.insert(self._pools, AgentPool.create(Agent[agentType]))
			for i=1, numRobots do
				local robot = self._pools[#self._pools]:takeRobot(allRobots)
				assert(#allRobots > 0, "Not enough robots for test configuration")
				table.removeValue(allRobots, robot)
			end
		end
	end
	self._testAgents = {}
	for _, behaviour in ipairs(behaviours) do
		table.insert(self._testAgents, TestAgent.create(allRobots[1], behaviour))
		assert(#allRobots > 0, "Not enough robots for test configuration")
		table.remove(allRobots,1)
	end

	self._lastMessages = Messages.create()
	self._specialTasks = {}
end

function AgentTest:run()
	-- create trainer message
	local trainerMessage = {}
	-- decide who gets the special tasks
	trainerMessage.specialTask = self:_coordinateTasks(self._lastMessages)
	-- broadcast trainer messages immediatelly
	self._lastMessages:setTrainer(Message.Trainer.create(trainerMessage))
	-- print in debug tree
	self._lastMessages:dump()	
	-- run pools and thus every agent
	local messages = Messages.create()
	for _, pool in pairs(self._pools) do
		pool:run(self._lastMessages, messages)
	end
	-- run every behaviour
	for _, agent in pairs(self._testAgents) do
		messages:addAgent(agent:robot(), agent:run(self._lastMessages))
	end
	-- store messages
	self._lastMessages = messages
end

function AgentTest:_coordinateTasks(messages)
	local messages = messages:all()
	local specialTasks = {}
	local specialRating = {}
	
	local hysteresis = 0.1 -- magic constant
	
	for robot, msg in pairs(messages) do
		if msg.agent and msg.agent.specialTask then
			local tasks = msg.agent.specialTask
			for name, rating in pairs(tasks) do
				if self._specialTasks[name] == robot then
					rating = rating + hysteresis
				end
				
				if (specialTasks[name] and specialRating[name] < rating) or not specialTasks[name] then
					specialTasks[name] = robot
					specialRating[name] = rating
				end
			end
		end
	end
	
	self._specialTasks = specialTasks
	return specialTasks
end

local pools = {}
local behaviours = {}
for _, pool in pairs(TestConfig.pools) do
	for agentType, numRobots in pairs(pool) do
		if numRobots > 0 then
			table.insert(pools, {[agentType] = numRobots})-- specify robots
		end
	end
end
for _, behaviour in pairs(TestConfig.behaviours) do
	if not Behaviour[behaviour] then
		error("Behaviour not declared in agents-test")
	end
	table.insert(behaviours, Behaviour[behaviour])
end

local test = nil
Entrypoints.add("testconfig", function()
	if not test then
		test = AgentTest.create(pools, behaviours)
	end
	test:run()
end)

return AgentTest
