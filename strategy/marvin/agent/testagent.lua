local TestAgent = (require "../base/class").new("Agent.Test", require "agent/base/agent")

local Messaging = require "control/messaging"
local Halt = require "agent/shared/halt"

function TestAgent.takeRobot(robots)
	for _, robot in pairs(robots) do
		return robot
	end
end

function TestAgent:init(robot, assignment)
	self._robot = robot
	self._testBehavior = nil
	self._task = nil
	self._assignedTask = nil
	self._haltBehavior = Halt.create(self)
	if assignment.task then
		if assignment.parameters then
			self._assignedTask = assignment.task.create(self, unpack(assignment.parameters))
		else
			self._assignedTask = assignment.task.create(self)
		end
	elseif assignment.behavior then
		if assignment.parameters then
			self._testBehavior = assignment.behavior.create(self, unpack(assignment.parameters))
		else
			self._testBehavior = assignment.behavior.create(self)
		end
	else
		error "A test-agent needs a task or behavior"
	end
	Messaging.registerAgent(self)
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
