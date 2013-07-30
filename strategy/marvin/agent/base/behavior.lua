local Base = (require "../base/class").new("Behavior.Base")

local Class = require "../base/class"

function Base:init(robot, inbox, send)
	self._task = nil
	self._robot = robot
	self._active = false
	self.inbox = inbox
	self.send = send
	self:_stop()
end

function Base:run()
	local bestTask, parameters = self:updateTask()
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

-- is called every frame, if no higher prioritized behavior is chosen
-- return true if behavior is appropriate
function Base:check()
	error("stub")
end

-- chooses and returns a task and its parameters
function Base:updateTask()
	error("stub")
end

function Base:stop()
	self._task = nil -- reset task
	self._active = false
	self:_stop()
end

-- can be overwritten
function Base:_stop()
	-- custom cleanups
end

function Base:task()
	return self._task
end

return Base
