local Base = (require "base/class").new("Task.Base")

Base._priority = 0

function Base:init(robot, ...)
	self._robot = robot
	self:_init(...)
	if self._priority == 0 then
		error("priority not set")
	end
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
	-- TODO: prepare logging
	local msg = self:_run(priorityMessages, notifications)
	-- TODO: finish logging
	return msg -- TODO: message to share with other tasks
end

return Base
