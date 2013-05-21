local Group = (require "../base/class").new("Behaviour.Group")
local Class = require "../base/class"

--[[
the first applicable behaviour is used, the others are called to ensure
proper cooldown handling
end]]--
function Group:init(robot, children)
	self._robot = robot
	self._children = children
end

function Group:run(isBehaviourChosen, ownMessages, priorityMessages,
		notifications, trainerMessages)
	self._messages = ownMessages
	self._priorityMessages = priorityMessages
	self._notifications = notifications
	self._trainerMessage = trainerMessages

	local activeBehaviour = nil
	local groupActive, agentMessage = self:_check()
	if not groupActive then
		isBehaviourChosen = true -- aborts every child behaviour
	end

	for _, child in ipairs(self._children) do
		local behaviour, messages = child:run(isBehaviourChosen, ownMessages,
				priorityMessages, notifications, trainerMessages)
		if messages then
			table.extendDeep(agentMessage, messages)
		end
		if isBehaviourChosen and behaviour then
			error("only one behaviour can be active at a time, violator: " .. Class.name(behaviour))
		end
		if behaviour then
			isBehaviourChosen = true
			activeBehaviour = behaviour
		end
	end

	return activeBehaviour, agentMessage
end

-- enables or disables this group, can be overwritten in subclasses
-- can send messages
function Group:_check()
	return true, {}
end

return Group
