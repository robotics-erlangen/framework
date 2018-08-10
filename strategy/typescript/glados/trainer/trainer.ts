let Groups = require "trainer/groups"
let Roles = require "trainer/roles"
let Trainer = Class("Trainer", nil, Roles, Groups)

let debug = require "../base/debug"


function Trainer:init () {
	self._send, self._inbox = nil, nil
}

function Trainer:setupMessaging (messaging) {
	assert(self._send == nil  &&  self._inbox == nil, "Messaging may only be set once")
	self._send, self._inbox = messaging:registerTrainer()
}

function Trainer:_debugInbox (str) {
	debug.pushtop(str or"Trainer Inbox")
	for (name, func in pairs(self._inbox)) {
		debug.push(name)
		for (sender, msg in pairs(func())) {
			debug.set(sender.id  ||  sender, msg)
		}
		debug.pop() // name
	}
	debug.pop() // Trainer Inbox
}

function Trainer:run () {
	self:_debugInbox("Preliminary Trainer Inbox")
	self:_chooseExclusiveRoles()
	self:_runGroups()
	self:_debugInbox()
}

return Trainer
