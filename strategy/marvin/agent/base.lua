local Base = (require "../base/class").new("Agent.Base")
local Class = require "../base/class"
local debug = require "../base/debug"
local World = require "../base/world"
local Message = require "agent/message"

local Halt = require "task/halt"

function Base.takeRobot(robots)
	error("stub")
end

-- has to be ordered by decreasing priority
Base._behaviours = {}

Base.__basicBehaviours = {
	"Halt",
	"Play"
}

function Base:init(robot)
	self._robot = robot
	self._task = nil
	self._behaviour = nil
	-- prepend default behaviors
	self._behaviours = table.append(table.copy(Base.__basicBehaviours), self._behaviours)
end

--[[ behaviour:
the first applicable behaviour is used, no further behaviours are checked

that way two behaviours of a single agent each asking for a special task
can't be chosen for their special task, causing the special task of the
behaviour of lower priority to be "missing"

function Base:check...(priorityMessages, notifications, trainerMessage)
	-- should not modfiy the agent
	return isApplicable, agentMessages
end
function Base:do...(priorityMessages, notifications, trainerMessage)
	-- create task
end]]--

function Base:checkHalt(priorityMessages, notifications, trainerMessage)
	return World.RefereeState == "Halt", {}
end

function Base:doHalt(priorityMessages, notifications, trainerMessage)
	if not self._task then
		self._task = Halt.create(self._robot)
	end
end

function Base:checkPlay(priorityMessages, notifications, trainerMessage)
	local play = trainerMessage.play
	return play and play[self._robot], {}
end

function Base:doPlay(priorityMessages, notifications, trainerMessage)
	self._task = trainerMessage.play[self._robot]
end

function Base:run(messages)
	local priorityMessages, notifications = messages:split(self._robot)
	local trainerMessage = messages:trainer()
	local agentMessage = {}
	
	-- required if no behaviour matches
	local behaviour = nil
	for _, name in ipairs(self._behaviours) do
		if not self["check" .. name] then
			error("function check" .. name .. " missing in agent " .. Class.name(self, true))
		end
		local isApplicable, messages = self["check" .. name](self, priorityMessages, notifications, trainerMessage)
		table.extend(agentMessage, messages)
		-- check behaviour until the first matching
		if isApplicable then
			behaviour = name
			break
		end
	end
	-- correctly handle no matching behaviour
	if self._behaviour ~= behaviour or not behaviour then
		self._task = nil -- reset task when behaviour changes
	end
	self._behaviour = behaviour
	if self._behaviour then
		self["do" .. self._behaviour](self, priorityMessages, notifications, trainerMessage)
	end
	
	
	debug.pushtop("Agents")
	debug.push("Robot " .. self._robot.id, Class.name(self, true) .. " (" .. tostring(self._behaviour) .. ")")
	
	local taskMessage
	if self._task then
		debug.push("Task" .. ((self._behaviour == "Play") and " (Play)" or ""), Class.name(self._task))
		taskMessage = self._task:run(priorityMessages, notifications)
		debug.pop()
	else
		debug.set("Task", nil)
	end
	
	debug.pop()
	debug.pop()
	
	local priority = self._task and self._task.priority or 0
	return Message.Container.create{agent = agentMessage, task = taskMessage or {}}, priority
end

function Base:robot()
	return self._robot
end

return Base
