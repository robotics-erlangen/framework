local AttackRatio = require "trainer/attackratio"
local Defense = require "trainer/defense"
local Roles = require "trainer/roles"
local Messaging = require "control/messaging"
local debug = require "../base/debug"

local Trainer = Class("Trainer", nil, AttackRatio, Defense, Roles)

function Trainer:init(mode)
    self._send, self._inbox = Messaging.registerTrainer()
    -- the instance function 'attackRatio' overwrites the method
    if mode == "passive" then
        self.attackRatio = function() return 0, 6 end
    elseif mode == "aggressive" then
        self.attackRatio = function() return 6, 0 end
    end
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
    self:_chooseManMarkAndCenterBacks()
end

return Trainer
