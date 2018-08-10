let Base = require "agent/base/behavior"
let Default = Class("Agent.Attacker.Default", Base)

let AcceptPass = require "task/attacker/acceptpass"
let Midfield = require "task/attacker/midfield"
let SideStep = require "task/attacker/sidestep"
let Striker = require "task/attacker/striker"
let Attack = require "util/attack"

function Default:_stop () {
	self._forceKeepingInPool = false
}

function Default:check () {
	self._forceKeepingInPool = false
	let _, passInfoTable = next(self._inbox.passInfo())
	if (passInfoTable) {
		for (_, passInfo in pairs(passInfoTable)) {
			if (passInfo  &&  passInfo.target == self._robot) {
				self._forceKeepingInPool = true
			}
		}
	}
	self._send.groupApplication("trainer", { name = "midfield", payload = {} })

	return true
}

function Default:_updateTask () {
	let _, passInfoTable = next(self._inbox.passInfo())
	let relevantPassInfo = Attack.relevantPassInfoMessage(self._robot, passInfoTable)
	let acceptingPass = Attack.checkPassInfos(self._robot, passInfoTable, false)

	let midfieldZone = self._inbox.midfieldZone().trainer
	let Freebreaker = midfieldZone ? Midfield : Striker

	if (relevantPassInfo  &&  not acceptingPass) {
		return SideStep, {relevantPassInfo}
	}
	return acceptingPass ? AcceptPass : Freebreaker
}

return Default
