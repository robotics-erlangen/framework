local Base = (require "../base/class").new("Task.Base")
local debug = require "../base/debug"

Base.priority = 0

function Base:init(robot, ...)
	assert(self.priority > 0, "priority not set")
	assert(robot ~= nil, "no robot passed")
	self._robot = robot
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

function Base:_run(priorityMessages, notifications)
	error("stub")
	-- hysteresis
end

function Base:run(priorityMessages, notifications)
	-- setup logging
	debug.pushtop("Robots")
	debug.push(tostring(self._robot.id))
	debug.set(nil, self.className)
	
	if not self._ratingRun then
		self:rate(priorityMessages, notifications)
	end
	
	local msg = self:_run(priorityMessages, notifications)
	
	-- cleanup
	debug.pop()
	debug.pop()
	self._ratingRun = false
	
	return msg
end

function Base:rate(priorityMessages, notifications)
	assert(priorityMessages ~= nil and notifications ~= nil, "rate must be called with messages!")
	self._ratingRun = true
	return self:_rate(priorityMessages, notifications)
end

function Base:_rate()
	--FIXME reenable later
	--log(self.className)
	--error("stub")
	-- generate rating between 0 and 1
end

function Base.factory(...)
	error("stub")
	-- return a function that create a task
end

return Base
