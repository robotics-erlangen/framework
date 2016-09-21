local Base = Class("Behavior.Base")


function Base:init(agent)
	self._agent = agent
	self._robot = self._agent:robot()
	self._send = self._agent._send
	self._inbox = self._agent._inbox
	self._mainAttackerParameters = nil
	self:_init()
	self:stop()
end

function Base:_init()
	-- overwrite if necessary
end

-- is called when another behavior is being chosen
function Base:stop()
	self._task = nil -- reset task
	self._agent:setTask(nil)
	self._active = false
	self._forceKeepingInPool = false
	self:_stop()
end

function Base:run()
	local bestTask, parameters = self:_updateTask()
	if not self._task or Class.toClass(self._task) ~= bestTask then
		if parameters then
			self._task = bestTask(self._agent, unpack(parameters))
		else
			self._task = bestTask(self._agent)
		end
		self._agent:setTask(self._task)
	end
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

function Base:robot()
	return self._robot
end

-- chooses and returns a task and its parameters
function Base:_updateTask()
	error("stub")
end

function Base:_applyForMainAttacker(target, endSpeedLength, overrideRating)
	self._mainAttackerParameters = { target, endSpeedLength, overrideRating }
end

function Base:mainAttackerParameters()
	return self._mainAttackerParameters
end

function Base:clearMainAttackerParameters()
	self._mainAttackerParameters = nil
end

-- can be overwritten for custom cleanups
function Base:_stop()
end

return Base
