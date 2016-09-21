local Roles = require "trainer/roles"
local Trainer = Class("Trainer", nil, Roles)

local debug = require "../base/debug"


function Trainer:init(messaging)
	self._send, self._inbox = nil, nil
end

function Trainer:setupMessaging(messaging)
	assert(self._send == nil and self._inbox == nil, "Messaging may only be set once")
	self._send, self._inbox = messaging:registerTrainer()
end

function Trainer:_debugInbox()
	debug.pushtop("Trainer Inbox")
	for name, func in pairs(self._inbox) do
		debug.push(name)
		for sender, msg in pairs(func()) do
			debug.set(sender.id or sender, msg)
		end
		debug.pop() -- name
	end
	debug.pop() -- Trainer Inbox
end

function Trainer:run()
	self:_debugInbox()
	self:_chooseExclusiveRoles()
end

return Trainer
