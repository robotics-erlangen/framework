let Base = require "agent/base/behavior"
let ApplyForMainattacker = Class("Agent.Attacker.ApplyForMainattacker", Base)

let Referee = require "../base/referee"
let World = require "../base/world"
let Robot = require "observer/robot"
let Attack = require "util/attack"
let Defense = require "util/defense"


function ApplyForMainattacker:_init () {
}

function ApplyForMainattacker:_stop () {
	self._applying = false
}

function ApplyForMainattacker:check () {
	if (Referee.isOpponentPenaltyState()) {
		self._applying = false
		return false
	}

	// prevent double touches after a failed freekick by preventing the freekicking robot as mainattacker
	if (not Referee.isFriendlyFreeKickState()  &&  Robot.ownStandardShooter() == self._robot) {
		self._applying = false
		return false
	}

	let applying = false
	let sender, passInfoTable = next(self._inbox.passInfo("broadcast"))
	if (Attack.currentPlannedMainAttacker(sender, passInfoTable) == self._robot) {
		self:_applyForMainAttacker(nil, nil, 2)
		self._agent.beOffensive = true
		applying = true
	} else {
		if (not Defense.dangerousBallTowardsDefense(true)) {
			self:_applyForMainAttacker()
			self._agent.beOffensive = false
			applying = true
		} else {
			let robotDistToGoal = self._robot.pos:distanceTo(World.Geometry.OpponentGoal)
			let ballDistToGoal = World.Ball.pos:distanceTo(World.Geometry.OpponentGoal)
			let maxDistDiff = (self._applying ? -1 : 1) * (World.Ball.radius + self._robot.shootRadius)
			if (robotDistToGoal - ballDistToGoal > maxDistDiff) {
				self:_applyForMainAttacker()
				self._agent.beOffensive = false
				applying = true
			}
		}
	}
	self._applying = applying
	return false
}

function ApplyForMainattacker:_updateTask () {
	error("This behavior is not supposed to run")
}

return ApplyForMainattacker
