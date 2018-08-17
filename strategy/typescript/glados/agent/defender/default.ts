let Base = require "agent/base/behavior"
let Default = Class("Agent.Defender.Default", Base)

let CenterBack = require "task/defender/centerback"
import * as Defense from "glados/util/defense";


function Default:_stop () {
	this._lastTarget = nil
	this._customBall = {}
}

function Default:check () {
	return true
}

function Default:_updateTask () {
	let role = this._inbox.roleAssignment().trainer
	let target = role ? role.name == "CenterBack" && role.params : this._customBall
	let restart = target != this._lastTarget
	this._lastTarget = target

	if (target == this._customBall) {
		let fieldPos, fieldDir = Defense.calculateBallPositionField()
		this._customBall.pos = fieldPos
		this._customBall.dir = fieldDir
	}

	return CenterBack, { target }, restart
}

return Default
