local Messages = (require "../base/class").new("Control.Messages")
local debug = require "../base/debug"

function Messages:init()
	self._messages = {}
	self._priorities = {}
	self._trainerMsg = nil
end

function Messages:addAgent(robot, message, priority)
	assert(priority and priority >= 0, "invalid priority")
	if self._messages[robot] then
		log(robot.id)
		error("Robot sent two messages")
	end
	
	self._messages[robot] = message
	self._priorities[robot] = priority
end

function Messages:trainer()
	assert(self._trainerMsg ~= nil, "Trainer message missing")
	return self._trainerMsg
end

function Messages:setTrainer(message)
	assert(self._trainerMsg == nil, "Trainer message already set")
	self._trainerMsg = message
end

function Messages:split(robot)
	local priority = self._priorities[robot] or 0
	
	local priorityMessages = {}
	local notifications = {}
	
	-- create message tables for task
	for lrobot, message in pairs(self._messages) do
		-- don't send own message to task
		if lrobot ~= robot then
			local lpriority = self._priorities[lrobot]
			-- other robots task has priority if his priority is higher then task's priority or when both are equal and his robot id is lower
			if lpriority > priority
					or (lpriority == priority and lrobot.id < robot.id) then
				priorityMessages[lrobot] = message
			else
				notifications[lrobot] = message
			end
		end
	end
	return priorityMessages, notifications
end

function Messages:all()
	return self._messages
end

function Messages:dump()
	debug.pushtop("Messages")
	debug.push("Agents")
	for robot, msg in pairs(self._messages) do
		debug.set("Robot " .. robot.id .. "(" .. self._priorities[robot] .. ")", msg)
	end
	debug.pop()
	debug.set("Trainer", self:trainer())
	debug.pop()
end

return Messages
