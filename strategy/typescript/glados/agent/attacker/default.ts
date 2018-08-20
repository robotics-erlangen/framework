import {Behavior} from "glados/agent/base/behavior";
let Default = Class("Agent.Attacker.Default", Base)

let AcceptPass = require "task/attacker/acceptpass"
let Midfield = require "task/attacker/midfield"
import {SideStep} from "glados/task/attacker/sidestep";
import {Striker} from "glados/task/attacker/striker";
import * as Attack from "glados/util/attack";

function Default:_stop () {
	this._forceKeepingInPool = false
}

function Default:check () {
	this._forceKeepingInPool = false
	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	if (passInfoTable) {
		for (_, passInfo in pairs(passInfoTable)) {
			if (passInfo && passInfo.target == this._robot) {
				this._forceKeepingInPool = true
			}
		}
	}
	this._send.groupApplication("trainer", { name = "midfield", payload = {} })

	return true
}

function Default:_updateTask () {
	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	let relevantPassInfo = Attack.relevantPassInfoMessage(this._robot, passInfoTable)
	let acceptingPass = Attack.checkPassInfos(this._robot, passInfoTable, false)

	let midfieldZone = this._inbox.midfieldZone().trainer
	let Freebreaker = midfieldZone ? Midfield : Striker

	if (relevantPassInfo && not acceptingPass) {
		return SideStep, {relevantPassInfo}
	}
	return acceptingPass ? AcceptPass : Freebreaker
}

return Default
