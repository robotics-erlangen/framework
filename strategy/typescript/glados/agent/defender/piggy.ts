import {Behavior} from "glados/agent/base/behavior";
let Piggy = Class("Agent.Defender.Piggy", Base)

import * as debug from "base/debug";
import * as Ball from "glados/observer/ball";
let InterceptPass = require "task/defender/interceptpass"
let PiggyTask = require "task/defender/piggy"


function Piggy:_stop () {
	this._opp = nil
}

function Piggy:check () {
	let role = this._inbox.roleAssignment().trainer
	return role && role.name == "Piggy"
}

function Piggy:_updateTask () {
	let newOpp = this._inbox.roleAssignment().trainer.params[1]
	let restartTask = newOpp != this._opp
	this._opp = newOpp

	debug.set("target", this._opp.id)

	if (Ball.receivesPass(this._opp)) {
		return InterceptPass
	} else {
		return PiggyTask, { this._opp }, restartTask
	}

}

return Piggy