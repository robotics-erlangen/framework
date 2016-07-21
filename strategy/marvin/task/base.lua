local Base = Class("Task.Base")

local debug = require "../base/debug"
local Messaging = require "control/messaging"


function Base:init(agent, ...)
	assert(agent ~= nil, "no agent passed")
	self._agent = agent
	self._robot = self._agent:robot()
	self._inbox = self._agent._inbox
	self._send = self._agent._send
	self:clearMainAttackerParameters()
	self:_init(...)
end

function Base:robot()
	return self._robot
end

function Base:run()
	error("stub")
end

function Base:_init()
end

function Base:clearMainAttackerParameters()
	self._mainAttackerParameters = nil
end

function Base:setMainAttackerParameters(target, endSpeedLength)
	self._mainAttackerParameters = { target, endSpeedLength }
end

function Base:mainAttackerParameters()
	return self._mainAttackerParameters
end

return Base
