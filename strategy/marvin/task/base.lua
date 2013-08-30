local Base = (require "../base/class").new("Task.Base")
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
	self._ratingRun = false
	self:_init(...)
end

function Base:robot()
	return self._robot
end

function Base:_init(...)
	error("stub")
	-- handle params
end

function Base:_run()
	error("stub")
	-- hysteresis
end

function Base:run()
	if not self._ratingRun then
		self:rate()
	end
	
	self:_run()
	
	self._ratingRun = false
end

function Base:rate()
	self._ratingRun = true
	self:_rate()
end

function Base:_rate()
	error("stub")
	-- generate rating between 0 and 1
end

function Base.factory(...)
	error("stub")
	-- return a function that create a task
end

return Base
