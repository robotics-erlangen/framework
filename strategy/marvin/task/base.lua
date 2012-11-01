local Base = (require "base/class").new("Task.Base")

Base._priority = 0

function Base:init(tm, robot, ...)
	self._taskmanager = tm
	self._robot = robot
	self:_init(...)
end

function Base:_run()
	error("stub")
	-- hysteresis
end

function Base:run()
	-- TODO: prepare logging
	local msg = self:_run()
	-- TODO: finish logging
	return msg -- TODO: message to share with other tasks
end
