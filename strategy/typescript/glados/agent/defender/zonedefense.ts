let Base = require "agent/base/behavior"
let ZoneDefense = Class("Agent.Defender.ZoneDefense", Base)

let BallEvadingMoveToPos = require "task/defender/ballevadingmovetopos"

function ZoneDefense:_stop () {
	this._movePos = nil
}

function ZoneDefense:check () {
	let role = this._inbox.roleAssignment().trainer
	return role && role.name == "ZoneDefense"
}

function ZoneDefense:_updateTask () {
	let movePos = this._inbox.roleAssignment().trainer.params[1]
	let restartTask = movePos != this._movePos
	this._movePos = movePos

	return BallEvadingMoveToPos, {this._movePos, nil}, restartTask
}

return ZoneDefense
