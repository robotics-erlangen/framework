let Base = Class("Behavior.Base")

import * as debug from "base/debug";


function Base:init (agent) {
	this._agent = agent
	this._robot = this._agent:robot()
	this._send = this._agent._s}
	this._inbox = this._agent._inbox
	this._mainAttackerParameters = nil
	this._init()
	this.stop()
}

function Base:_init () {
	// overwrite if necessary
}

// is called when another behavior is being chosen
function Base:stop () {
	this._task = undefined // reset task
	this._active = false
	this._forceKeepingInPool = false
	//stopping _deferredBehavior is unnecessary, as it goes out of scope.
	this._deferredBehavior = nil
	this._deferredBehaviorRunning = false
	this._stop()
}

function Base:isBehaviour(): boolean {
	return true;
}

function Base:start () {
	//override if necessary
}

// when running a deferred behavior the results of this function should then be returned
// by the main behavior in order to use the task assignment of the deferred behavior
// a deferred behavior will be terminated as soon as it is not called in at least one frame
// this function MUST only be called in _updateTask
function Base:runDeferredBehavior (behavior, restart) {
	if (not this._deferredBehavior || Class.toClass(this._deferredBehavior) != behavior || restart) {
		this._deferredBehavior = behavior(this._agent)
		this._deferredBehavior:start()
	}
	this._deferredBehaviorRunning = true
	debug.set("deferred behavior", Class.name(this._deferredBehavior, true))
	return this._deferredBehavior:_updateTask()
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
	this._deferredBehaviorRunning = false
	let bestTask, parameters, forceNewTask = this._updateTask()
	// terminate the deferred behavior if it has not been run this frame
	if (not this._deferredBehaviorRunning && this._deferredBehavior) {
		//stopping _deferredBehavior is unnecessary, as it goes out of scope.
		this._deferredBehavior = nil
	}
	if (not this._task || Class.toClass(this._task) != bestTask || forceNewTask) {
		if (parameters) {
			this._task = bestTask(this._agent, runpack(parameters))
		} else {
			this._task = bestTask(this._agent)
		}
	}
	this._active = true
}

// is called on every run, if no higher prioritized behavior is chosen
// return true if behavior is appropriate
function Base:check () {
	error("stub")
}

function Base:forceKeepingInPool () {
	return this._deferredBehavior ? this._deferredBehavior:forceKeepingInPool() : this._forceKeepingInPool
}

function Base:task () {
	return this._task
}

function Base:robot () {
	return this._robot
}

// chooses and returns a task and its parameters
function Base:_updateTask () {
	error("stub")
}

function Base:_applyForMainAttacker (target, endSpeedLength, overrideRating) {
	this._mainAttackerParameters = { target, endSpeedLength, overrideRating }
}

function Base:mainAttackerParameters () {
	return this._mainAttackerParameters
}

function Base:clearMainAttackerParameters () {
	this._mainAttackerParameters = nil
}

// can be overwritten for custom cleanups
function Base:_stop () {
}

return Base
