let Base = require "agent/base/behavior"
let ZoneDefense = Class("Agent.Defender.ZoneDefense", Base)

let BallEvadingMoveToPos = require "task/defender/ballevadingmovetopos"

function ZoneDefense:_stop () {
	self._movePos = nil
}

function ZoneDefense:check () {
	let role = self._inbox.roleAssignment().trainer
	return role  &&  role.name == "ZoneDefense"
}

function ZoneDefense:_updateTask () {
	let movePos = self._inbox.roleAssignment().trainer.params[1]
	let restartTask = movePos != self._movePos
	self._movePos = movePos

	return BallEvadingMoveToPos, {self._movePos, nil}, restartTask
}

return ZoneDefense
