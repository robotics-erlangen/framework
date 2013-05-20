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
-- may be nested, in that case the first behaviour name is just a check for that group
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

function Base:checkHalt()
	return World.RefereeState == "Halt"
end

function Base:doHalt()
	if not self._task then
		self._task = Halt.create(self._robot)
	end
end

function Base:checkPlay()
	local play = self._trainerMessage.play
	return play and play[self._robot]
end

function Base:doPlay()
	self._task = self._trainerMessage.play[self._robot]
end

function Base:_findBehaviour(behaviours, isNested, agentMessage)
	for i, name in ipairs(behaviours) do
		-- skip first check if nested
		if not (i == 1 and isNested) then
			local behaviour
			if type(name) == "table" then
				behaviour = name[1]
			else
				behaviour = name
			end
			
			if not self["check" .. behaviour] then
				error("function check" .. behaviour .. " missing in agent " .. Class.name(self, true))
			end
			local isApplicable, messages = self["check" .. behaviour](self)
			if messages then
				table.extendDeep(agentMessage, messages)
			end
			if isApplicable and type(name) == "table" then
				-- behaviour becomes be nil if no subbehaviour matches
				behaviour = self:_findBehaviour(name, true, agentMessage)
			end
			-- check behaviour until the first matching
			if behaviour and isApplicable then
				return behaviour
			end
		end
	end
	return nil
end
	
function Base:run(messages)
	self._priorityMessages, self._notifications = messages:split(self._robot)
	self._messages = messages:own(self._robot)
	self._trainerMessage = messages:trainer()
	local agentMessage = {}
	
	local behaviour = self:_findBehaviour(self._behaviours, false, agentMessage)
	-- correctly handle no matching behaviour
	if self._behaviour ~= behaviour or not behaviour then
		self._task = nil -- reset task when behaviour changes
	end
	self._behaviour = behaviour
	if self._behaviour then
		self["do" .. self._behaviour](self)
	end
	
	
	debug.pushtop("Agents")
	debug.push("Robot " .. self._robot.id, Class.name(self, true) .. " (" .. tostring(self._behaviour) .. ")")
	
	local taskMessage
	if self._task then
		debug.push("Task" .. ((self._behaviour == "Play") and " (Play)" or ""), Class.name(self._task))
		taskMessage = self._task:run(self._priorityMessages, self._notifications)
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
