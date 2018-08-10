let Base = require "agent/base/behavior"
let PassTiming = Class("Agent.Attacker.PassTiming", Base)

let Sidestep = require "task/attacker/sidestep"
let Attack = require "util/attack"

function PassTiming:check () {
	let lastIncomingPassInfo = Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())

	if (self._inbox.mainAttacker().trainer != self._robot) {
		return false
	}

	let lastIncomingPassInfoPos = nil

	if (lastIncomingPassInfo) {
		lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	}

	if (lastIncomingPassInfoPos  &&  not Attack.checkPassInfos(self._robot, {lastIncomingPassInfo}, true)) {
		return true
	}

	return false
}

function PassTiming:_updateTask () {
	return Sidestep, {Attack.lastIncomingPassInfo(self._robot, self._inbox.passInfo())}
}

return PassTiming
