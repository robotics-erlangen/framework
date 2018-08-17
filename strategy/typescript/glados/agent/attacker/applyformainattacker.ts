let Base = require "agent/base/behavior"
let ApplyForMainattacker = Class("Agent.Attacker.ApplyForMainattacker", Base)

import * as Referee from "base/referee";
import * as World from "base/world";
import * as Robot from "glados/observer/robot";
import * as Attack from "glados/util/attack";
import * as Defense from "glados/util/defense";


function ApplyForMainattacker:_init () {
}

function ApplyForMainattacker:_stop () {
	this._applying = false
}

function ApplyForMainattacker:check () {
	if (Referee.isOpponentPenaltyState()) {
		this._applying = false
		return false
	}

	// prevent double touches after a failed freekick by preventing the freekicking robot as mainattacker
	if (not Referee.isFriendlyFreeKickState() && Robot.ownStandardShooter() == this._robot) {
		this._applying = false
		return false
	}

	let applying = false
	let sender, passInfoTable = next(this._inbox.passInfo("broadcast"))
	if (Attack.currentPlannedMainAttacker(sender, passInfoTable) == this._robot) {
		this._applyForMainAttacker(nil, undefined, 2)
		this._agent.beOffensive = true
		applying = true
	} else {
		if (not Defense.dangerousBallTowardsDefense(true)) {
			this._applyForMainAttacker()
			this._agent.beOffensive = false
			applying = true
		} else {
			let robotDistToGoal = this._robot.pos.distanceTo(World.Geometry.OpponentGoal)
			let ballDistToGoal = World.Ball.pos.distanceTo(World.Geometry.OpponentGoal)
			let maxDistDiff = (this._applying ? -1 : 1) * (World.Ball.radius + this._robot.shootRadius)
			if (robotDistToGoal - ballDistToGoal > maxDistDiff) {
				this._applyForMainAttacker()
				this._agent.beOffensive = false
				applying = true
			}
		}
	}
	this._applying = applying
	return false
}

function ApplyForMainattacker:_updateTask () {
	error("This behavior is not supposed to run")
}

return ApplyForMainattacker
