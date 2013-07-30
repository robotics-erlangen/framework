local Base = (require "../base/class").new("Task.Base")
local debug = require "../base/debug"

Base.priority = 0

function Base:init(robot, inbox, send, ...)
	assert(self.priority > 0, "priority not set")
	assert(robot ~= nil, "no robot passed")
	assert(inbox ~= nil, "inbox not passed")
	assert(send ~= nil, "sender object not passed")
	self._robot = robot
	self.inbox = inbox
	self.send = send
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
