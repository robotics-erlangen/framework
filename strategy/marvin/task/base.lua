local Base = (require "../base/class").new("Task.Base")
local debug = require "../base/debug"

Base.priority = 0

function Base:init(robot, ...)
	self._robot = robot
	self:_init(...)
	if self.priority <= 0 then
		error("priority not set")
	end
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
	
	local msg = self:_run(priorityMessages, notifications)
	
	-- cleanup
	debug.pop()
	debug.pop()
	
	return msg
end

return Base
