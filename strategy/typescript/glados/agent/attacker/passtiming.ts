import {Behavior} from "glados/agent/base/behavior";
let PassTiming = Class("Agent.Attacker.PassTiming", Base)

let Sidestep = require "task/attacker/sidestep"
import * as Attack from "glados/util/attack";

function PassTiming:check () {
	let lastIncomingPassInfo = Attack.lastIncomingPassInfo(this._robot, this._inbox.passInfo())

	if (this._inbox.mainAttacker().trainer != this._robot) {
		return false
	}

	let lastIncomingPassInfoPos = nil

	if (lastIncomingPassInfo) {
		lastIncomingPassInfoPos = lastIncomingPassInfo.ballPos
	}

	if (lastIncomingPassInfoPos && not Attack.checkPassInfos(this._robot, {lastIncomingPassInfo}, true)) {
		return true
	}

	return false
}

function PassTiming:_updateTask () {
	return Sidestep, {Attack.lastIncomingPassInfo(this._robot, this._inbox.passInfo())}
}

return PassTiming
