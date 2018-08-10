let Base = Class("Task.Base")


function Base:init (agent, ...) {
	assert(agent != nil, "no agent passed")
	self._agent = agent
	self._robot = self._agent:robot()
	self._inbox = self._agent._inbox
	self._send = self._agent._s}
	self:clearMainAttackerParameters()
	self:_init(...)
}

function Base:robot () {
	return self._robot
}

function Base:run () {
	error("stub")
}

function Base:_init () {
}

function Base:clearMainAttackerParameters () {
	self._mainAttackerParameters = nil
}

function Base:setMainAttackerParameters (target, endSpeedLength) {
	self._mainAttackerParameters = { target, endSpeedLength }
}

function Base:mainAttackerParameters () {
	return self._mainAttackerParameters
}

return Base
