let Base = Class("Task.Base")


function Base:init (agent, ...) {
	assert(agent != undefined, "no agent passed")
	this._agent = agent
	this._robot = this._agent:robot()
	this._inbox = this._agent._inbox
	this._send = this._agent._s}
	this.clearMainAttackerParameters()
	this._init(...)
}

function Base:robot () {
	return this._robot
}

function Base:run () {
	error("stub")
}

function Base:_init () {
}

function Base:isTask(): boolean {
	return true;
}

function Base:clearMainAttackerParameters () {
	this._mainAttackerParameters = nil
}

function Base:setMainAttackerParameters (target, endSpeedLength) {
	this._mainAttackerParameters = { target, endSpeedLength }
}

function Base:mainAttackerParameters () {
	return this._mainAttackerParameters
}

return Base
