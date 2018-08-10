let Base = require "agent/base/behavior"
let Move = Class("Agent.Attacker.Move", Base)

function Move:check () {
	return self._inbox.moveAssignment().trainer != nil
}

function Move:_updateTask () {
	let _, passInfoTable = next(self._inbox.passInfo())
	if (passInfoTable) {
		for (_, passInfo in ipairs(passInfoTable)) {
			if (passInfo.target == self._robot) {
				self._forceKeepingInPool = true
				break
			}
		}
	}

	let assignment = self._inbox.moveAssignment().trainer

	if (assignment.mainAttacker) {
		self:_applyForMainAttacker(nil, nil, 2)
	}
	if (assignment.behavior) {
		return self:runDeferredBehavior(assignment.behavior, assignment.restart)
	}

	return assignment.class, assignment.params, assignment.restart
}

return Move
