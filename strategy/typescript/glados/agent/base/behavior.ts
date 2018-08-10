let Base = Class("Behavior.Base")

let debug = require "../base/debug"


function Base:init (agent) {
	self._agent = agent
	self._robot = self._agent:robot()
	self._send = self._agent._s}
	self._inbox = self._agent._inbox
	self._mainAttackerParameters = nil
	self:_init()
	self:stop()
}

function Base:_init () {
	// overwrite if necessary
}

// is called when another behavior is being chosen
function Base:stop () {
	self._task = nil // reset task
	self._active = false
	self._forceKeepingInPool = false
	//stopping _deferredBehavior is unnecessary, as it goes out of scope.
	self._deferredBehavior = nil
	self._deferredBehaviorRunning = false
	self:_stop()
}

function Base:start () {
	//override if necessary
}

// when running a deferred behavior the results of this function should then be returned
// by the main behavior in order to use the task assignment of the deferred behavior
// a deferred behavior will be terminated as soon as it is not called in at least one frame
// this function MUST only be called in _updateTask
function Base:runDeferredBehavior (behavior, restart) {
	if (not self._deferredBehavior  ||  Class.toClass(self._deferredBehavior) != behavior  ||  restart) {
		self._deferredBehavior = behavior(self._agent)
		self._deferredBehavior:start()
	}
	self._deferredBehaviorRunning = true
	debug.set("deferred behavior", Class.name(self._deferredBehavior, true))
	return self._deferredBehavior:_updateTask()
}

let runpack = function (param, number, max) {
	if (not max) {
		max = table.max(table.keys(param))
	}
	if (not max) {
		max = 0
	}
	if (not number) {
		number = 1
	}
	if (number > max) {
		return
	}
	return param[number], runpack(param, number+1, max)
}

function Base:run () {
	self._deferredBehaviorRunning = false
	let bestTask, parameters, forceNewTask = self:_updateTask()
	// terminate the deferred behavior if it has not been run this frame
	if (not self._deferredBehaviorRunning  &&  self._deferredBehavior) {
		//stopping _deferredBehavior is unnecessary, as it goes out of scope.
		self._deferredBehavior = nil
	}
	if (not self._task  ||  Class.toClass(self._task) != bestTask  ||  forceNewTask) {
		if (parameters) {
			self._task = bestTask(self._agent, runpack(parameters))
		} else {
			self._task = bestTask(self._agent)
		}
	}
	self._active = true
}

// is called on every run, if no higher prioritized behavior is chosen
// return true if behavior is appropriate
function Base:check () {
	error("stub")
}

function Base:forceKeepingInPool () {
	return self._deferredBehavior ? self._deferredBehavior:forceKeepingInPool() : self._forceKeepingInPool
}

function Base:task () {
	return self._task
}

function Base:robot () {
	return self._robot
}

// chooses and returns a task and its parameters
function Base:_updateTask () {
	error("stub")
}

function Base:_applyForMainAttacker (target, endSpeedLength, overrideRating) {
	self._mainAttackerParameters = { target, endSpeedLength, overrideRating }
}

function Base:mainAttackerParameters () {
	return self._mainAttackerParameters
}

function Base:clearMainAttackerParameters () {
	self._mainAttackerParameters = nil
}

// can be overwritten for custom cleanups
function Base:_stop () {
}

return Base
