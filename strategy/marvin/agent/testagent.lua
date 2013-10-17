local TestAgent = (require "../base/class").new("Agent.Test", require "agent/base/agent")

local Messaging = require "control/messaging"
local Halt = require "agent/shared/halt"

function TestAgent.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function TestAgent:init(robot, assignment)
	self._robot = robot
	self._testBehavior = nil
	self._task = nil
	self._assignedTask = nil
	self._haltBehavior = Halt.create(self)
	if assignment.task then
		local task = require("task/" .. assignment.task.name)
		if assignment.task.parameters then
			self._assignedTask = task.create(self, unpack(assignment.task.parameters))
		else
			self._assignedTask = task.create(self)
		end
	elseif assignment.behavior then
		self._testBehavior = require(assignment.behavior).create(self)
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
