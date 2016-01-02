local Base = Class("Task.Base")

local debug = require "../base/debug"
local Messaging = require "control/messaging"


function Base:init(agent, ...)
	assert(agent ~= nil, "no agent passed")
	self._agent = agent
	self._robot = self._agent:robot()
	self._inbox = self._agent._inbox
	self._send = self._agent._send
	if self._init then
		self:_init(...)
	end
end

function Base:robot()
	return self._robot
end

function Base:run()
	error("stub")
end

return Base
