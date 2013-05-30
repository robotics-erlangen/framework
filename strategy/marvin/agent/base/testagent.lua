local TestAgent = (require "../base/class").new("TestAgent", require "agent/base/agent")
local debug = require "../base/debug"
local Class = require "../base/class"
local Message = require "agent/base/message"


function TestAgent:init(robot, behaviour)
	self._robot = robot
	-- set the only behaviour
	self._behaviour = behaviour.create(robot)
end

function TestAgent:run(messages)
	local ownMessages = messages:own(self._robot)
	local priorityMessages, notifications = messages:split(self._robot)
	local trainerMessage = messages:trainer()

	self._behaviour:_run() -- avoid normal choosing process in run()
	local task = self._behaviour:task()

	debug.pushtop("Agents")
	local behaviourName = self._behaviour and ("(" .. Class.name(self._behaviour, true) .. ")") or ""
	debug.push("Robot " .. self._robot.id, Class.name(self, true) .. " " .. behaviourName)
	
	local taskMessage
	if task then
		debug.push("Task", Class.name(task))
		taskMessage = task:run(priorityMessages, notifications)
		debug.pop()
	else
		debug.set("Task", nil)
	end
	
	debug.pop()
	debug.pop()
	
	local priority = task and task.priority or 0
	return Message.Container.create{agent = agentMessage, task = taskMessage or {}}, priority
end

return TestAgent