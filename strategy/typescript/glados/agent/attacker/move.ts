let Base = require "agent/base/behavior"
let Move = Class("Agent.Attacker.Move", Base)

function Move:check () {
	return this._inbox.moveAssignment().trainer != nil
}

function Move:_updateTask () {
	let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
	if (passInfoTable) {
		for (_, passInfo in ipairs(passInfoTable)) {
			if (passInfo.target == this._robot) {
				this._forceKeepingInPool = true
				break
			}
		}
	}

	let assignment = this._inbox.moveAssignment().trainer

	if (assignment.mainAttacker) {
		this._applyForMainAttacker(nil, undefined, 2)
	}
	if (assignment.behavior) {
		return this.runDeferredBehavior(assignment.behavior, assignment.restart)
	}

	return assignment.class, assignment.params, assignment.restart
}

return Move
