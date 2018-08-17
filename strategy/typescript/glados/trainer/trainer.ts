let Groups = require "trainer/groups"
let Roles = require "trainer/roles"
let Trainer = Class("Trainer", undefined, Roles, Groups)

import * as debug from "base/debug";


function Trainer:init () {
	this._send, this._inbox = undefined, nil
}

function Trainer:setupMessaging (messaging) {
	assert(this._send == undefined && this._inbox == undefined, "Messaging may only be set once")
	this._send, this._inbox = messaging:registerTrainer()
}

function Trainer:_debugInbox (str) {
	debug.pushtop(str or"Trainer Inbox")
	for (name, func in pairs(this._inbox)) {
		debug.push(name)
		for (sender, msg in pairs(func())) {
			debug.set(sender.id || sender, msg)
		}
		debug.pop() // name
	}
	debug.pop() // Trainer Inbox
}

function Trainer:run () {
	this._debugInbox("Preliminary Trainer Inbox")
	this._chooseExclusiveRoles()
	this._runGroups()
	this._debugInbox()
}

return Trainer
