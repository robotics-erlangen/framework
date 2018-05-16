local Base = Class("Behavior.Base")

local debug = require "../base/debug"


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
	self._active = false
	self._forceKeepingInPool = false
	--stopping _deferredBehavior is unnecessary, as it goes out of scope.
	self._deferredBehavior = nil
	self._deferredBehaviorRunning = false
	self:_stop()
end

function Base:start()
	--override if necessary
end

-- when running a deferred behavior the results of this function should then be returned
-- by the main behavior in order to use the task assignment of the deferred behavior
-- a deferred behavior will be terminated as soon as it is not called in at least one frame
-- this function MUST only be called in _updateTask
function Base:runDeferredBehavior(behavior, restart)
	if not self._deferredBehavior or Class.toClass(self._deferredBehavior) ~= behavior or restart then
		self._deferredBehavior = behavior(self._agent)
		self._deferredBehavior:start()
	end
	self._deferredBehaviorRunning = true
	debug.set("deferred behavior", Class.name(self._deferredBehavior, true))
	return self._deferredBehavior:_updateTask()
end

function Base:run()
	self._deferredBehaviorRunning = false
	local bestTask, parameters, forceNewTask = self:_updateTask()
	-- terminate the deferred behavior if it has not been run this frame
	if not self._deferredBehaviorRunning and self._deferredBehavior then
		--stopping _deferredBehavior is unnecessary, as it goes out of scope.
		self._deferredBehavior = nil
	end
	if not self._task or Class.toClass(self._task) ~= bestTask or forceNewTask then
		if parameters then
			self._task = bestTask(self._agent, unpack(parameters))
		else
			self._task = bestTask(self._agent)
		end
	end
	self._active = true
end

-- is called on every run, if no higher prioritized behavior is chosen
-- return true if behavior is appropriate
function Base:check()
	error("stub")
end

function Base:forceKeepingInPool()
	return self._deferredBehavior and self._deferredBehavior:forceKeepingInPool() or self._forceKeepingInPool
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
