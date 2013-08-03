local Base = (require "../base/class").new("Behavior.Base")

local Class = require "../base/class"

function Base:init(robot, inbox, send)
	self._robot = robot
	self.inbox = inbox
	self.send = send
	self:stop()
end

-- is called when another behavior is being chosen
function Base:stop()
	self._task = nil -- reset task
	self._active = false
	self._forceKeepingInPool = false
	self:_stop()
end

function Base:run()
	local bestTask, parameters = self:_updateTask()
	if not self._task or not Class.instanceOf(self._task, bestTask) then
		if parameters then
			self._task = bestTask.create(self._robot, self.inbox, self.send, unpack(parameters))
		else
			self._task = bestTask.create(self._robot, self.inbox, self.send)
		end	
	end
	self._task:run()
	self._active = true
end

-- is called on every run, if no higher prioritized behavior is chosen
-- return true if behavior is appropriate
function Base:check()
	error("stub")
end

function Base:forceKeepingInPool()
	return self._forceKeepingInPool
end

function Base:task()
	return self._task
end

-- chooses and returns a task and its parameters
function Base:_updateTask()
	error("stub")
end

-- can be overwritten for custom cleanups
function Base:_stop()
end

return Base
