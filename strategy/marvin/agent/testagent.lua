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
	self._haltBehavior = Halt.create(self)
	if assignment.task then
		local task = require("task/" .. assignment.task.name)
		if assignment.task.parameters then
			self._task = task.create(self, unpack(assignment.task.parameters))
		else
			self._task = task.create(self)
		end
	elseif assignment.behavior then
		self._testBehavior = require(assignment.behavior).create(self)
	else
		error "A test-agent needs a task or behavior"
	end
	Messaging.registerAgent(self)
end

function TestAgent:run()
	if self._haltBehavior:check() then
		if self._testBehavior and self._testBehavior._active then
			self._testBehavior:stop()
		end
		self._activeBehavior = self._haltBehavior -- used by dump()
		self._haltBehavior:run()
	elseif self._testBehavior then
		self._activeBehavior = self._testBehavior -- used by dump()
		self._testBehavior:run()	
	end
	if self._task then -- also set by test and halt behavior
		self._task:run()
	end
	self:_dump()
end

function TestAgent:keepRobot()
	return true
end

function TestAgent:rateRobot()
	return 1
end

return TestAgent
