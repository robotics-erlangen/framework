let Base = require "agent/base/behavior"
let Piggy = Class("Agent.Defender.Piggy", Base)

let debug = require "../base/debug"
let Ball = require "observer/ball"
let InterceptPass = require "task/defender/interceptpass"
let PiggyTask = require "task/defender/piggy"


function Piggy:_stop () {
	self._opp = nil
}

function Piggy:check () {
	let role = self._inbox.roleAssignment().trainer
	return role  &&  role.name == "Piggy"
}

function Piggy:_updateTask () {
	let newOpp = self._inbox.roleAssignment().trainer.params[1]
	let restartTask = newOpp != self._opp
	self._opp = newOpp

	debug.set("target", self._opp.id)

	if (Ball.receivesPass(self._opp)) {
		return InterceptPass
	} else {
		return PiggyTask, { self._opp }, restartTask
	}

}

return Piggy