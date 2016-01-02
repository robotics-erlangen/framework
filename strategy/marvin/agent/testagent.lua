local Base = require "agent/base/agent"
local TestAgent = Class("Agent.Test", Base)

local Halt = require "agent/shared/halt"
local Messaging = require "control/messaging"


function TestAgent.takeRobot(robots)
	for _, robot in pairs(robots) do
		return robot
	end
end

function TestAgent:init(robot, assignment)
	assert(robot, "Cannot create agent: Robot does not exist")
	self._robot = robot
	self._testBehavior = nil
	self._task = nil
	self._assignedTask = nil
	self._activeBehavior = nil
	self._haltBehavior = Halt(self)
	self._send, self._inbox = Messaging.registerAgent(self)
	if assignment.task then
		if assignment.parameters then
			self._assignedTask = assignment.task(self, unpack(assignment.parameters))
		else
			self._assignedTask = assignment.task(self)
		end
	elseif assignment.behavior then
		if assignment.parameters then
			self._testBehavior = assignment.behavior(self, unpack(assignment.parameters))
		else
			self._testBehavior = assignment.behavior(self)
		end
	else
		error "A test-agent needs a task or behavior"
	end
end

function TestAgent:_updateBehavior()
	if self._haltBehavior:check() then
		if self._testBehavior and self._testBehavior._active then
			self._testBehavior:stop()
		end
		self._activeBehavior = self._haltBehavior
	elseif self._assignedTask then
		self._task = self._assignedTask
		self._activeBehavior = nil
	elseif self._testBehavior then
		self._activeBehavior = self._testBehavior
	end
end

function TestAgent:keepRobot()
	return true
end

function TestAgent:rateRobot()
	return 1
end

return TestAgent
