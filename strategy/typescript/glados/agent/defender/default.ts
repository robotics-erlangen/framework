let Base = require "agent/base/behavior"
let Default = Class("Agent.Defender.Default", Base)

let CenterBack = require "task/defender/centerback"
let Defense = require "util/defense"


function Default:_stop () {
	self._lastTarget = nil
	self._customBall = {}
}

function Default:check () {
	return true
}

function Default:_updateTask () {
	let role = self._inbox.roleAssignment().trainer
	let target = role ? role.name == "CenterBack"  &&  role.params : self._customBall
	let restart = target != self._lastTarget
	self._lastTarget = target

	if (target == self._customBall) {
		let fieldPos, fieldDir = Defense.calculateBallPositionField()
		self._customBall.pos = fieldPos
		self._customBall.dir = fieldDir
	}

	return CenterBack, { target }, restart
}

return Default
