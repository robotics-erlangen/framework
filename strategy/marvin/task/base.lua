local Class = require "../base/class"
local Base = Class.newTask("Task.Base")
local debug = require "../base/debug"
local Messaging = require "control/messaging"

Base.priority = 0

function Base:init(agent, ...)
	assert(self.priority > 0, "priority not set")
	assert(agent ~= nil, "no agent passed")
	self._agent = agent
	self._robot = self._agent:robot()
	self._inbox = Messaging.getInbox(self._agent, self.priority)
	self._send = Messaging.getSender(self._agent, self.priority)
	self:_init(...)
end

function Base:robot()
	return self._robot
end

function Base:_init(...)
	error("stub")
	-- handle params
end

function Base:run()
	error("stub")
	-- hysteresis
end

return Base
